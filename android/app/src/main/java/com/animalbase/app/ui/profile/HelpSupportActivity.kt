package com.animalbase.app.ui.profile

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import com.animalbase.app.databinding.ActivityHelpSupportBinding
import com.animalbase.app.ui.base.SessionAwareActivity

class HelpSupportActivity : SessionAwareActivity() {

    private lateinit var binding: ActivityHelpSupportBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityHelpSupportBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setSupportActionBar(binding.toolbar)
        binding.toolbar.setNavigationOnClickListener { onBackPressedDispatcher.onBackPressed() }

        binding.rowSupportEmail.setOnClickListener {
            runCatching {
                startActivity(
                    Intent(Intent.ACTION_SENDTO).apply {
                        data = Uri.parse("mailto:support@animalbase.com")
                    }
                )
            }
        }

        binding.rowSupportPhone.setOnClickListener {
            runCatching {
                startActivity(
                    Intent(Intent.ACTION_DIAL).apply {
                        data = Uri.parse("tel:+63912345678")
                    }
                )
            }
        }
    }
}
