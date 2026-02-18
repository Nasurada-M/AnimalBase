package com.animalbase.app.ui.home

import android.content.Intent
import android.os.Bundle
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import com.animalbase.app.databinding.ActivityMainBinding
import com.animalbase.app.ui.adoption.AdoptionFragment
import com.animalbase.app.ui.encyclopedia.EncyclopediaFragment
import com.animalbase.app.ui.missing.MissingPetsFragment
import com.animalbase.app.ui.profile.ProfileActivity
import com.animalbase.app.ui.report.ReportMissingActivity
import com.animalbase.app.ui.report.ReportSightingActivity
import com.google.android.material.bottomsheet.BottomSheetDialog

/**
 * MainActivity: Container for bottom navigation and fragments
 *
 * ======================================================
 * BOTTOM NAV:
 *   - Home, Adopt, [FAB], Missing, Encyclopedia
 *   - FAB (center "+") opens AddOptionsBottomSheet
 * ======================================================
 */
class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private var currentFragment: Fragment? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Default fragment
        showFragment(HomeFragment())
        setNavSelected("home")

        // Bottom nav clicks
        binding.navHome.setOnClickListener {
            showFragment(HomeFragment()); setNavSelected("home")
        }
        binding.navAdopt.setOnClickListener {
            showFragment(AdoptionFragment()); setNavSelected("adopt")
        }
        binding.navMissing.setOnClickListener {
            showFragment(MissingPetsFragment()); setNavSelected("missing")
        }
        binding.navEncyclopedia.setOnClickListener {
            showFragment(EncyclopediaFragment()); setNavSelected("encyclopedia")
        }

        // FAB: show add options bottom sheet
        binding.fabAdd.setOnClickListener { showAddOptionsSheet() }
    }

    private fun showFragment(fragment: Fragment) {
        currentFragment = fragment
        supportFragmentManager.beginTransaction()
            .replace(binding.fragmentContainer.id, fragment)
            .commit()
    }

    private fun setNavSelected(selected: String) {
        val primary = resources.getColor(com.animalbase.app.R.color.primary, null)
        val unselected = resources.getColor(com.animalbase.app.R.color.nav_bar_unselected, null)
        binding.ivNavHome.setColorFilter(if (selected == "home") primary else unselected)
        binding.ivNavAdopt.setColorFilter(if (selected == "adopt") primary else unselected)
        binding.ivNavMissing.setColorFilter(if (selected == "missing") primary else unselected)
        binding.ivNavEncyclopedia.setColorFilter(if (selected == "encyclopedia") primary else unselected)
    }

    /**
     * Center "+" FAB opens a bottom sheet with options:
     * - Report Missing Pet → ReportMissingActivity
     * - Report Sighting → ReportSightingActivity
     */
    private fun showAddOptionsSheet() {
        val sheet = BottomSheetDialog(this)
        val view = layoutInflater.inflate(
            com.animalbase.app.R.layout.bottom_sheet_add_options, null
        )
        view.findViewById<View>(com.animalbase.app.R.id.btnReportMissing)?.setOnClickListener {
            startActivity(Intent(this, ReportMissingActivity::class.java))
            sheet.dismiss()
        }
        view.findViewById<View>(com.animalbase.app.R.id.btnReportSighting)?.setOnClickListener {
            startActivity(Intent(this, ReportSightingActivity::class.java))
            sheet.dismiss()
        }
        view.findViewById<View>(com.animalbase.app.R.id.btnGoProfile)?.setOnClickListener {
            startActivity(Intent(this, ProfileActivity::class.java))
            sheet.dismiss()
        }
        sheet.setContentView(view)
        sheet.show()
    }
}
