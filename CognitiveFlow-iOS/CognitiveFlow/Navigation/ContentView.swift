// CognitiveFlow-iOS/CognitiveFlow/Navigation/ContentView.swift
import SwiftUI

enum AppTab: String, CaseIterable {
    case capture = "Capture"
    case focus = "Focus"
    case settings = "Settings"

    var icon: String {
        switch self {
        case .capture:  return "tray.and.arrow.down"
        case .focus:    return "checkmark.square"
        case .settings: return "gearshape"
        }
    }
}

struct ContentView: View {
    @Environment(\.horizontalSizeClass) private var sizeClass
    @State private var selectedTab: AppTab = .capture

    var body: some View {
        // iPad: NavigationSplitView (mirrors web SideNav.tsx)
        // iPhone: TabView (mirrors web TabBar.tsx)
        if sizeClass == .regular {
            iPadLayout
        } else {
            iPhoneLayout
        }
    }

    private var iPhoneLayout: some View {
        TabView(selection: $selectedTab) {
            CaptureView()
                .tabItem { Label("Capture", systemImage: AppTab.capture.icon) }
                .tag(AppTab.capture)

            FocusView()
                .tabItem { Label("Focus", systemImage: AppTab.focus.icon) }
                .tag(AppTab.focus)

            SettingsView()
                .tabItem { Label("Settings", systemImage: AppTab.settings.icon) }
                .tag(AppTab.settings)
        }
        .tint(.accentColor)
    }

    private var iPadLayout: some View {
        NavigationSplitView {
            List(AppTab.allCases, id: \.self, selection: $selectedTab) { tab in
                Label(tab.rawValue, systemImage: tab.icon)
                    .tag(tab)
            }
            .navigationTitle("Cognitive Flow")
        } detail: {
            switch selectedTab {
            case .capture:  CaptureView()
            case .focus:    FocusView()
            case .settings: SettingsView()
            }
        }
    }
}
