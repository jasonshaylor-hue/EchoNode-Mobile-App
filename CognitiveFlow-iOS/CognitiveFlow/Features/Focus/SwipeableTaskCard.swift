// CognitiveFlow-iOS/CognitiveFlow/Features/Focus/SwipeableTaskCard.swift
import SwiftUI

struct SwipeableTaskCard: View {
    let task: AppTask
    let onComplete: () async -> Void
    let onDelete: () async -> Void

    var body: some View {
        TaskCardView(task: task, isCompleted: false) { _ in
            Task { await onComplete() }
        }
        // Swipe left to delete — maps web drag x < -80 threshold
        .swipeActions(edge: .trailing, allowsFullSwipe: true) {
            Button(role: .destructive) {
                Task { await onDelete() }
            } label: {
                Label("Delete", systemImage: "trash")
            }
        }
        // Swipe right to complete
        .swipeActions(edge: .leading, allowsFullSwipe: true) {
            Button {
                Task { await onComplete() }
            } label: {
                Label("Done", systemImage: "checkmark.circle")
            }
            .tint(.green)
        }
    }
}
