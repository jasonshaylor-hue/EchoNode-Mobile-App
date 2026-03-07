// CognitiveFlow-iOS/CognitiveFlow/Services/PhoneWatchBridge.swift
import Foundation
import WatchConnectivity

final class PhoneWatchBridge: NSObject {
    static let shared = PhoneWatchBridge()
    private let supabase = SupabaseService.shared

    func startSession() {
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    private func sendTokenToWatch() {
        Task {
            guard let session = try? await supabase.client.auth.session else { return }
            let token = session.accessToken
            if WCSession.default.isReachable {
                WCSession.default.sendMessage(["token": token], replyHandler: nil)
            } else {
                try? WCSession.default.updateApplicationContext(["token": token])
            }
        }
    }
}

extension PhoneWatchBridge: WCSessionDelegate {
    func session(_ session: WCSession, activationDidCompleteWith state: WCSessionActivationState, error: Error?) {
        if state == .activated { sendTokenToWatch() }
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
        if message["action"] as? String == "requestToken" {
            Task {
                let token = try? await SupabaseService.shared.client.auth.session?.accessToken
                replyHandler(["token": token ?? ""])
            }
        }
    }

    func sessionDidBecomeInactive(_ session: WCSession) {}
    func sessionDidDeactivate(_ session: WCSession) { session.activate() }
}
