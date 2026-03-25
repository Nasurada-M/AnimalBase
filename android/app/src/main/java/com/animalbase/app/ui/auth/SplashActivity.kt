package com.animalbase.app.ui.auth

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.animalbase.app.databinding.ActivitySplashBinding
import com.animalbase.app.ui.home.MainActivity
import com.animalbase.app.utils.SessionManager

class SplashActivity : AppCompatActivity() {

    private lateinit var binding: ActivitySplashBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (SessionManager(this).isLoggedIn()) {
            startActivity(Intent(this, MainActivity::class.java))
            finish()
            return
        }

        binding = ActivitySplashBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.btnPrimaryAction.setOnClickListener {
            startActivity(Intent(this, RegisterActivity::class.java))
        }

        binding.btnSecondaryAction.setOnClickListener {
            startActivity(Intent(this, LoginActivity::class.java))
        }
    }
}
