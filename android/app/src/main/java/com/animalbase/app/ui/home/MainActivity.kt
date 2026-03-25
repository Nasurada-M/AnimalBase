package com.animalbase.app.ui.home

import android.Manifest
import android.content.Intent
import android.os.Build
import android.os.Bundle
import androidx.activity.result.contract.ActivityResultContracts
import androidx.fragment.app.Fragment
import com.animalbase.app.databinding.ActivityMainBinding
import com.animalbase.app.ui.applications.ApplicationsFragment
import com.animalbase.app.ui.adoption.AdoptionFragment
import com.animalbase.app.ui.base.SessionAwareActivity
import com.animalbase.app.ui.missing.MissingPetsFragment
import com.animalbase.app.ui.profile.ProfileActivity
import com.animalbase.app.utils.NotificationHelper
import com.animalbase.app.utils.NotificationNavigator
import com.animalbase.app.utils.NotificationPollingWorker
import com.animalbase.app.utils.WebSocketManager

class MainActivity : SessionAwareActivity() {

    companion object {
        private const val KEY_CURRENT_TAB = "current_tab"
        private const val TAB_ADOPTION = "adoption"
    }

    private lateinit var binding: ActivityMainBinding
    private lateinit var wsManager: WebSocketManager
    private var currentTab: String = NotificationNavigator.TAB_HOME

    private val notifPermission = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        NotificationHelper.createChannel(this)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            notifPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
        }

        if (session.isLoggedIn()) {
            NotificationPollingWorker.schedule(this)
        }

        wsManager = WebSocketManager(this)

        binding.navHome.setOnClickListener {
            navigateToHome()
        }
        binding.navAdoption.setOnClickListener {
            navigateToAdoptionCatalog()
        }
        binding.navPetFinder.setOnClickListener {
            navigateToTab(NotificationNavigator.TAB_PET_FINDER)
        }
        binding.navApplications.setOnClickListener {
            navigateToTab(NotificationNavigator.TAB_APPLICATIONS)
        }
        binding.navProfile.setOnClickListener {
            openProfile()
        }

        if (savedInstanceState == null) {
            handleNavigationIntent(intent, fallbackToHome = true)
        } else {
            currentTab = savedInstanceState.getString(KEY_CURRENT_TAB, currentTab)
            syncCurrentTabWithVisibleFragment()
            setNavSelected(currentTab)
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleNavigationIntent(intent, fallbackToHome = false)
    }

    override fun onStart() {
        super.onStart()
        if (session.isLoggedIn()) wsManager.connect()
    }

    override fun onStop() {
        super.onStop()
        wsManager.disconnect()
    }

    override fun onResume() {
        super.onResume()
        syncCurrentTabWithVisibleFragment()
        setNavSelected(currentTab)
    }

    override fun onSaveInstanceState(outState: Bundle) {
        outState.putString(KEY_CURRENT_TAB, currentTab)
        super.onSaveInstanceState(outState)
    }

    private fun showFragment(fragment: Fragment) {
        val transaction = supportFragmentManager.beginTransaction()
            .replace(binding.fragmentContainer.id, fragment)

        if (supportFragmentManager.isStateSaved) {
            transaction.commitAllowingStateLoss()
        } else {
            transaction.commit()
        }
    }

    fun navigateToHome() {
        navigateToTab(NotificationNavigator.TAB_HOME)
    }

    fun navigateToAdoptionCatalog() {
        navigateToTab(TAB_ADOPTION)
    }

    private fun openProfile() {
        startActivity(
            Intent(this, ProfileActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
        )
    }

    fun navigateToTab(tab: String) {
        currentTab = tab
        val fragment = when (tab) {
            TAB_ADOPTION -> AdoptionFragment()
            NotificationNavigator.TAB_PET_FINDER -> MissingPetsFragment()
            NotificationNavigator.TAB_APPLICATIONS -> ApplicationsFragment()
            else -> HomeFragment()
        }
        showFragment(fragment)
        setNavSelected(currentTab)
    }

    private fun handleNavigationIntent(intent: Intent?, fallbackToHome: Boolean) {
        val targetTab = intent?.getStringExtra(NotificationNavigator.EXTRA_OPEN_TAB)
        if (targetTab.isNullOrBlank()) {
            if (fallbackToHome) {
                navigateToHome()
            }
            return
        }

        navigateToTab(targetTab)
        intent?.removeExtra(NotificationNavigator.EXTRA_OPEN_TAB)
    }

    private fun syncCurrentTabWithVisibleFragment() {
        currentTab = when (supportFragmentManager.findFragmentById(binding.fragmentContainer.id)) {
            is MissingPetsFragment -> NotificationNavigator.TAB_PET_FINDER
            is ApplicationsFragment -> NotificationNavigator.TAB_APPLICATIONS
            is AdoptionFragment -> TAB_ADOPTION
            is HomeFragment -> NotificationNavigator.TAB_HOME
            else -> currentTab
        }
    }

    private fun setNavSelected(selected: String) {
        val primary = getColor(com.animalbase.app.R.color.primary)
        val unselected = getColor(com.animalbase.app.R.color.nav_bar_unselected)

        binding.ivNavHome.setColorFilter(if (selected == NotificationNavigator.TAB_HOME) primary else unselected)
        binding.ivNavAdoption.setColorFilter(if (selected == TAB_ADOPTION) primary else unselected)
        binding.ivNavPetFinder.setColorFilter(if (selected == NotificationNavigator.TAB_PET_FINDER) primary else unselected)
        binding.ivNavApplications.setColorFilter(if (selected == NotificationNavigator.TAB_APPLICATIONS) primary else unselected)
        binding.ivNavProfile.setColorFilter(if (selected == "profile") primary else unselected)

        binding.tvNavHome.setTextColor(if (selected == NotificationNavigator.TAB_HOME) primary else unselected)
        binding.tvNavAdoption.setTextColor(if (selected == TAB_ADOPTION) primary else unselected)
        binding.tvNavPetFinder.setTextColor(if (selected == NotificationNavigator.TAB_PET_FINDER) primary else unselected)
        binding.tvNavApplications.setTextColor(if (selected == NotificationNavigator.TAB_APPLICATIONS) primary else unselected)
        binding.tvNavProfile.setTextColor(if (selected == "profile") primary else unselected)
    }
}
