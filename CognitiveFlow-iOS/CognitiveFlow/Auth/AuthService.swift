// CognitiveFlow-iOS/CognitiveFlow/Auth/AuthService.swift
import AuthenticationServices
import CryptoKit
import Foundation
import Supabase

@MainActor
final class AuthService: NSObject {
    static let shared = AuthService()
    private let client = SupabaseService.shared.client
    private var currentNonce: String?

    // Call this before presenting the Sign In with Apple sheet to prepare the nonce
    func prepareNonce() -> String {
        let raw = randomNonceString()
        currentNonce = raw
        return sha256(raw)  // hashed nonce goes to Apple; raw nonce to Supabase
    }

    // Handle result from SignInWithAppleButton onCompletion
    func handleAuthorization(_ result: Result<ASAuthorization, Error>) async throws {
        switch result {
        case .success(let auth):
            guard
                let credential = auth.credential as? ASAuthorizationAppleIDCredential,
                let tokenData = credential.identityToken,
                let identityToken = String(data: tokenData, encoding: .utf8),
                let nonce = currentNonce
            else { throw AuthError.invalidCredential }

            try await client.auth.signInWithIdToken(credentials: .init(
                provider: .apple,
                idToken: identityToken,
                nonce: nonce
            ))

        case .failure(let error):
            throw error
        }
    }

    // MARK: - Nonce helpers

    private func randomNonceString(length: Int = 32) -> String {
        let charset = "0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._"
        return String((0..<length).compactMap { _ in charset.randomElement() })
    }

    private func sha256(_ input: String) -> String {
        let hash = SHA256.hash(data: Data(input.utf8))
        return hash.compactMap { String(format: "%02x", $0) }.joined()
    }
}

enum AuthError: LocalizedError {
    case invalidCredential
    var errorDescription: String? { "Invalid Sign In with Apple credential." }
}
