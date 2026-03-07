// CognitiveFlow-iOS/CognitiveFlowWatch/WatchFocusView.swift
import SwiftUI

struct WatchFocusView: View {
    @Environment(WatchSessionManager.self) private var session
    @State private var tasks: [AppTask] = []
    @State private var isLoading = true

    var body: some View {
        Group {
            if isLoading {
                ProgressView()
            } else if tasks.isEmpty {
                VStack {
                    Image(systemName: "checkmark.circle")
                    Text("No tasks for today")
                        .font(.caption)
                }
            } else {
                List(tasks) { task in
                    WatchTaskRow(task: task, token: session.accessToken ?? "")
                }
            }
        }
        .navigationTitle("Focus")
        .task { await loadFocusTasks() }
    }

    private func loadFocusTasks() async {
        guard let token = session.accessToken else { isLoading = false; return }
        let today = ISO8601DateFormatter().string(from: Date()).prefix(10)
        let urlStr = "\(supabaseURL)/functions/v1/daily-focus?date=\(today)"
        guard let url = URL(string: urlStr) else { isLoading = false; return }

        var req = URLRequest(url: url)
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        struct Response: Decodable { let tasks: [AppTask] }
        if let (data, _) = try? await URLSession.shared.data(for: req),
           let decoded = try? JSONDecoder().decode(Response.self, from: data) {
            tasks = decoded.tasks
        }
        isLoading = false
    }

    private var supabaseURL: String { Bundle.main.infoDictionary?["SUPABASE_URL"] as? String ?? "" }
}
