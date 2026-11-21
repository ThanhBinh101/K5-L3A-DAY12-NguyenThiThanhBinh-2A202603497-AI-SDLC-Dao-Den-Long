import AVFoundation
import CoreGraphics
import CoreVideo
import Foundation
import ImageIO

private struct FrameIndex: Decodable {
    let width: Int
    let height: Int
    let durationSeconds: Double
    let frames: [Frame]

    struct Frame: Decodable {
        let file: String
        let time: Double
    }
}

private enum EncoderError: LocalizedError {
    case message(String)

    var errorDescription: String? {
        switch self {
        case let .message(message): return message
        }
    }
}

private func makeBuffer(
    from image: CGImage,
    width: Int,
    height: Int,
    pool: CVPixelBufferPool
) throws -> CVPixelBuffer {
    var result: CVPixelBuffer?
    let allocation = CVPixelBufferPoolCreatePixelBuffer(kCFAllocatorDefault, pool, &result)
    guard allocation == kCVReturnSuccess, let buffer = result else {
        throw EncoderError.message("Could not allocate a video frame ((allocation)).")
    }
    CVPixelBufferLockBaseAddress(buffer, [])
    defer { CVPixelBufferUnlockBaseAddress(buffer, []) }
    let format = CGBitmapInfo.byteOrder32Little.rawValue | CGImageAlphaInfo.premultipliedFirst.rawValue
    guard let context = CGContext(
        data: CVPixelBufferGetBaseAddress(buffer),
        width: width, height: height, bitsPerComponent: 8,
        bytesPerRow: CVPixelBufferGetBytesPerRow(buffer),
        space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: format
    ) else {
        throw EncoderError.message("Could not initialize frame conversion.")
    }
    context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
    return buffer
}

private func timestamp(_ seconds: Double) -> CMTime {
    CMTime(seconds: seconds, preferredTimescale: 600)
}

@main
private struct Encode {
    static func main() async throws {
        let args = CommandLine.arguments
        guard args.count == 3 else {
            throw EncoderError.message("Usage: encode-demo <frame-index.json> <output.mp4>")
        }

        let indexURL = URL(fileURLWithPath: args[1])
        let output = URL(fileURLWithPath: args[2])
        let index = try JSONDecoder().decode(FrameIndex.self, from: Data(contentsOf: indexURL))
        guard index.frames.count > 1, index.durationSeconds > 0, index.durationSeconds < 300 else {
            throw EncoderError.message("Capture must contain multiple frames and last under five minutes.")
        }

        let writer = try AVAssetWriter(outputURL: output, fileType: .mp4)
        writer.shouldOptimizeForNetworkUse = true
        let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
            AVVideoCodecKey: AVVideoCodecType.h264,
            AVVideoWidthKey: index.width,
            AVVideoHeightKey: index.height,
            AVVideoCompressionPropertiesKey: [
                AVVideoAverageBitRateKey: 2_300_000,
                AVVideoExpectedSourceFrameRateKey: 30,
                AVVideoMaxKeyFrameIntervalKey: 90
            ]
        ])
        let adaptor = AVAssetWriterInputPixelBufferAdaptor(
            assetWriterInput: input, sourcePixelBufferAttributes: [
                kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
                kCVPixelBufferWidthKey as String: index.width,
                kCVPixelBufferHeightKey as String: index.height
            ]
        )

        guard writer.canAdd(input) else {
            throw EncoderError.message("H.264 encoding is unavailable.")
        }
        writer.add(input)
        guard writer.startWriting() else {
            throw writer.error ?? EncoderError.message("Could not start video encoding.")
        }
        writer.startSession(atSourceTime: .zero)
        guard let pool = adaptor.pixelBufferPool else {
            throw EncoderError.message("Missing video pixel buffer pool.")
        }

        let frameDirectory = indexURL.deletingLastPathComponent()
        for frame in index.frames {
            let frameURL = frameDirectory.appendingPathComponent(frame.file)
            guard let source = CGImageSourceCreateWithURL(frameURL as CFURL, nil),
                  let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
                throw EncoderError.message("Could not read browser image (frame.file).")
            }
            let buffer = try makeBuffer(from: image, width: index.width, height: index.height, pool: pool)
            let limit = Date().addingTimeInterval(10)
            while !input.isReadyForMoreMediaData, writer.status == .writing, Date() < limit {
                try await Task.sleep(for: .milliseconds(5))
            }
            guard input.isReadyForMoreMediaData, adaptor.append(buffer, withPresentationTime: timestamp(frame.time)) else {
                throw writer.error ?? EncoderError.message("Video encoder stopped before all frames were written.")
            }
        }
        writer.endSession(atSourceTime: timestamp(index.durationSeconds))
        input.markAsFinished()
        await writer.finishWriting()
        guard writer.status == .completed else {
            throw writer.error ?? EncoderError.message("Could not finalize MP4.")
        }

        let asset = AVURLAsset(url: output)
        let duration = try await asset.load(.duration).seconds
        let tracks = try await asset.loadTracks(withMediaType: .video)
        guard let track = tracks.first, try await asset.load(.isPlayable) else {
            throw EncoderError.message("Encoded MP4 could not be played.")
        }
        let dimensions = try await track.load(.naturalSize)
        let bytes = try output.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0
        guard duration > 0, duration < 300, bytes > 0, bytes < 100_000_000 else {
            throw EncoderError.message("Encoded video exceeds the lab's runtime or upload limit.")
        }
        let summary = String(format: "Verified H.264 MP4 · %.1f s · %.1f MB · %d×%d",
                             duration, Double(bytes) / 1_000_000,
                             Int(dimensions.width), Int(dimensions.height))
        print(summary)
    }
}
