package com.animalbase.app.ui.profile

import android.os.Bundle
import com.animalbase.app.databinding.ActivityAboutAppBinding
import com.animalbase.app.ui.base.SessionAwareActivity

class AboutAppActivity : SessionAwareActivity() {

    private lateinit var binding: ActivityAboutAppBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityAboutAppBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setSupportActionBar(binding.toolbar)
        binding.toolbar.setNavigationOnClickListener { onBackPressedDispatcher.onBackPressed() }
    }
}
