// CognitiveFlow-iOS/CognitiveFlow/Features/Focus/NextTaskBannerView.swift
import SwiftUI

struct NextTaskBannerView: View {
    let result: NextTaskResult
    let onComplete: () async -> Void
    let onDelete: () async -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let task = result.task {
                SwipeableTaskCard(task: task, onComplete: onComplete, onDelete: onDelete)
            } else {
                Text("All caught up! No open tasks.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Text(result.rationale)
                .font(.caption)
                .foregroundStyle(.secondary)
                .italic()
        }
    }
}
