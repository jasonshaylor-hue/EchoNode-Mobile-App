// CognitiveFlow-iOS/CognitiveFlow/Services/SupabaseService.swift
import Foundation
import Supabase

final class SupabaseService {
    static let shared = SupabaseService()

    let client: SupabaseClient

    private init() {
        guard
            let urlString = Bundle.main.infoDictionary?["SUPABASE_URL"] as? String,
            let url = URL(string: urlString),
            let anonKey = Bundle.main.infoDictionary?["SUPABASE_ANON_KEY"] as? String
        else {
            fatalError("Missing SUPABASE_URL or SUPABASE_ANON_KEY in Info.plist / xcconfig")
        }

        client = SupabaseClient(supabaseURL: url, supabaseKey: anonKey)
    }

    // Fetch all thoughts for authenticated user, newest first
    func fetchThoughts() async throws -> [CapturedThought] {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601

        return try await client.database
            .from("thoughts")
            .select()
            .order("created_at", ascending: false)
            .execute()
            .value
    }
}
