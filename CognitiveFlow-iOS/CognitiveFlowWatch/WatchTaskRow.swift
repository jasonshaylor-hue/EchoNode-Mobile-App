// CognitiveFlow-iOS/CognitiveFlowWatch/WatchTaskRow.swift
import SwiftUI

struct WatchTaskRow: View {
    let task: AppTask
    let token: String
    @State private var isDone = false

    var body: some View {
        Button {
            Task { await completeTask() }
        } label: {
            HStack {
                Image(systemName: isDone ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(isDone ? .green : .secondary)
                Text(task.title)
                    .font(.caption)
                    .lineLimit(2)
                    .strikethrough(isDone)
                Spacer()
            }
        }
        .buttonStyle(.plain)
        .disabled(isDone)
    }

    private func completeTask() async {
        guard let url = URL(string: "\(supabaseURL)/rest/v1/tasks?id=eq.\(task.id.uuidString)") else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "PATCH"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue(anonKey, forHTTPHeaderField: "apikey")
        req.httpBody = try? JSONSerialization.data(withJSONObject: [
            "status": "done",
            "completed_at": ISO8601DateFormatter().string(from: Date())
        ])
        if let (_, _) = try? await URLSession.shared.data(for: req) {
            isDone = true
        }
    }

    private var supabaseURL: String { Bundle.main.infoDictionary?["SUPABASE_URL"] as? String ?? "" }
    private var anonKey: String { Bundle.main.infoDictionary?["SUPABASE_ANON_KEY"] as? String ?? "" }
}
