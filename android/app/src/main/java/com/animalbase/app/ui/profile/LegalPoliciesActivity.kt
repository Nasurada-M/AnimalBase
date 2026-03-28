package com.animalbase.app.ui.profile

import android.os.Bundle
import com.animalbase.app.databinding.ActivityLegalPoliciesBinding
import com.animalbase.app.ui.base.SessionAwareActivity

class LegalPoliciesActivity : SessionAwareActivity() {

    private lateinit var binding: ActivityLegalPoliciesBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityLegalPoliciesBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setSupportActionBar(binding.toolbar)
        binding.toolbar.setNavigationOnClickListener { onBackPressedDispatcher.onBackPressed() }
    }
}
