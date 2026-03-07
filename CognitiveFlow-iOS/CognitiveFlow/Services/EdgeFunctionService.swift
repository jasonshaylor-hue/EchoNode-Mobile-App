// CognitiveFlow-iOS/CognitiveFlow/Services/EdgeFunctionService.swift
import Foundation
import Supabase

final class EdgeFunctionService {
    static let shared = EdgeFunctionService()
    private let client = SupabaseService.shared.client

    private let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.dateDecodingStrategy = .iso8601
        return d
    }()

    // Calls process-thought Edge Function — runs full AI pipeline
    func processThought(rawText: String) async throws -> CapturedThought {
        struct RequestBody: Encodable { let rawText: String }
        return try await client.functions
            .invoke("process-thought", options: .init(body: RequestBody(rawText: rawText)))
    }

    // Calls next-task Edge Function — AI picks best task
    func fetchNextTask() async throws -> NextTaskResult {
        struct Response: Decodable {
            let task: AppTask?
            let rationale: String
        }
        let response: Response = try await client.functions
            .invoke("next-task", options: .init(body: EmptyBody()))
        return NextTaskResult(task: response.task, rationale: response.rationale)
    }

    // Calls daily-focus Edge Function — cached top 3 tasks for today
    func fetchDailyFocus() async throws -> [AppTask] {
        let today = ISO8601DateFormatter().string(from: Date()).prefix(10)
        struct Response: Decodable { let tasks: [AppTask] }
        let response: Response = try await client.functions
            .invoke("daily-focus", options: .init(queryParams: [("date", String(today))]))
        return response.tasks
    }
}

private struct EmptyBody: Encodable {}
