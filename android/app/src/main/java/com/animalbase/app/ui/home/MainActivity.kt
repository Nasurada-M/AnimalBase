package com.animalbase.app.ui.home

import android.Manifest
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.view.View
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import com.animalbase.app.databinding.ActivityMainBinding
import com.animalbase.app.ui.adoption.AdoptionFragment
import com.animalbase.app.ui.encyclopedia.EncyclopediaFragment
import com.animalbase.app.ui.missing.MissingPetsFragment
import com.animalbase.app.ui.profile.ProfileActivity
import com.animalbase.app.ui.report.ReportMissingActivity
import com.animalbase.app.ui.report.ReportSightingActivity
import com.animalbase.app.utils.NotificationHelper
import com.animalbase.app.utils.NotificationPollingWorker
import com.animalbase.app.utils.SessionManager
import com.animalbase.app.utils.WebSocketManager
import com.google.android.material.bottomsheet.BottomSheetDialog

/**
 * MainActivity
 *
 * Push notification pipeline (no Firebase):
 *   • WebSocketManager  — real-time while app is open (foreground/background)
 *   • NotificationPollingWorker — WorkManager poll every 15 min as fallback
 *   • NotificationHelper — posts local Android notifications
 *
 * ======================================================
 * BOTTOM NAV ICONS: change tint colors in colors.xml
 *   nav_bar_selected / nav_bar_unselected
 * CENTER FAB COLOR: fab_background in colors.xml
 * ======================================================
 */
class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var wsManager: WebSocketManager
    private val session by lazy { SessionManager(this) }

    // Android 13+ notification permission
    private val notifPermission = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { /* granted or denied — we still function either way */ }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Create local notification channel (required on Android 8+)
        NotificationHelper.createChannel(this)

        // Request POST_NOTIFICATIONS permission (Android 13+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            notifPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
        }

        // Schedule WorkManager background polling (no Firebase needed)
        if (session.isLoggedIn()) {
            NotificationPollingWorker.schedule(this)
        }

        // Initialise WebSocket manager
        wsManager = WebSocketManager(this)

        // Default screen
        showFragment(HomeFragment())
        setNavSelected("home")

        // Bottom nav
        binding.navHome.setOnClickListener        { showFragment(HomeFragment());        setNavSelected("home") }
        binding.navAdopt.setOnClickListener       { showFragment(AdoptionFragment());    setNavSelected("adopt") }
        binding.navMissing.setOnClickListener     { showFragment(MissingPetsFragment()); setNavSelected("missing") }
        binding.navEncyclopedia.setOnClickListener{ showFragment(EncyclopediaFragment()); setNavSelected("encyclopedia") }

        // Center "+" FAB
        binding.fabAdd.setOnClickListener { showAddOptionsSheet() }
    }

    // ── WebSocket lifecycle ───────────────────────────────────────────────────

    override fun onStart() {
        super.onStart()
        if (session.isLoggedIn()) wsManager.connect()
    }

    override fun onStop() {
        super.onStop()
        wsManager.disconnect()
    }

    // ── Fragment navigation ───────────────────────────────────────────────────

    private fun showFragment(fragment: Fragment) {
        supportFragmentManager.beginTransaction()
            .replace(binding.fragmentContainer.id, fragment)
            .commit()
    }

    private fun setNavSelected(selected: String) {
        val primary    = resources.getColor(com.animalbase.app.R.color.primary, null)
        val unselected = resources.getColor(com.animalbase.app.R.color.nav_bar_unselected, null)
        binding.ivNavHome.setColorFilter(         if (selected == "home")          primary else unselected)
        binding.ivNavAdopt.setColorFilter(        if (selected == "adopt")         primary else unselected)
        binding.ivNavMissing.setColorFilter(      if (selected == "missing")       primary else unselected)
        binding.ivNavEncyclopedia.setColorFilter( if (selected == "encyclopedia")  primary else unselected)
    }

    // ── "+" FAB bottom sheet ──────────────────────────────────────────────────

    private fun showAddOptionsSheet() {
        val sheet = BottomSheetDialog(this)
        val view  = layoutInflater.inflate(com.animalbase.app.R.layout.bottom_sheet_add_options, null)
        view.findViewById<View>(com.animalbase.app.R.id.btnReportMissing)?.setOnClickListener {
            startActivity(Intent(this, ReportMissingActivity::class.java)); sheet.dismiss()
        }
        view.findViewById<View>(com.animalbase.app.R.id.btnReportSighting)?.setOnClickListener {
            startActivity(Intent(this, ReportSightingActivity::class.java)); sheet.dismiss()
        }
        view.findViewById<View>(com.animalbase.app.R.id.btnGoProfile)?.setOnClickListener {
            startActivity(Intent(this, ProfileActivity::class.java)); sheet.dismiss()
        }
        sheet.setContentView(view)
        sheet.show()
    }
}
