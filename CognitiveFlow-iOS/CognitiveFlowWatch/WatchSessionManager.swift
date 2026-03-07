// CognitiveFlow-iOS/CognitiveFlowWatch/WatchSessionManager.swift
import Foundation
import WatchConnectivity
import Observation

@Observable
@MainActor
final class WatchSessionManager: NSObject {
    static let shared = WatchSessionManager()
    var accessToken: String?

    override init() {
        super.init()
        if WCSession.isSupported() {
            WCSession.default.delegate = self
            WCSession.default.activate()
        }
    }

    func requestToken() {
        guard WCSession.default.isReachable else { return }
        WCSession.default.sendMessage(["action": "requestToken"]) { [weak self] reply in
            DispatchQueue.main.async {
                self?.accessToken = reply["token"] as? String
            }
        } errorHandler: { _ in }
    }
}

extension WatchSessionManager: WCSessionDelegate {
    nonisolated func session(_ session: WCSession, activationDidCompleteWith state: WCSessionActivationState, error: Error?) {
        if state == .activated {
            Task { @MainActor in self.requestToken() }
        }
    }

    nonisolated func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        if let token = message["token"] as? String {
            Task { @MainActor in self.accessToken = token }
        }
    }

    nonisolated func session(_ session: WCSession, didReceiveApplicationContext context: [String: Any]) {
        if let token = context["token"] as? String {
            Task { @MainActor in self.accessToken = token }
        }
    }
}
