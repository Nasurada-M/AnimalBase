package com.animalbase.app.ui.map

import android.content.Intent
import android.location.Geocoder
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.animalbase.app.databinding.ActivityMapBinding
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.OnMapReadyCallback
import com.google.android.gms.maps.SupportMapFragment
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.MarkerOptions
import java.util.Locale

/**
 * MapActivity: Google Maps integration for picking/viewing locations
 *
 * ======================================================
 * GOOGLE MAPS API KEY:
 *   Set in app/build.gradle → resValue "string", "google_maps_key", "YOUR_KEY"
 *   Get your key from: https://console.cloud.google.com/
 *   Enable: Maps SDK for Android + Geocoding API
 * ======================================================
 * Modes:
 *   "pick"  = user taps to select a location → returns lat/lng/address
 *   "view"  = shows a marker at given lat/lng
 */
class MapActivity : AppCompatActivity(), OnMapReadyCallback {

    private lateinit var binding: ActivityMapBinding
    private lateinit var googleMap: GoogleMap
    private var selectedLatLng: LatLng? = null
    private val mode by lazy { intent.getStringExtra("mode") ?: "view" }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMapBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setSupportActionBar(binding.toolbar)
        supportActionBar?.title = if (mode == "pick") "Pick Location" else "View Location"
        binding.toolbar.setNavigationOnClickListener { onBackPressed() }

        val mapFragment = supportFragmentManager
            .findFragmentById(com.animalbase.app.R.id.mapFragment) as? SupportMapFragment
        mapFragment?.getMapAsync(this)

        binding.btnConfirmLocation.setOnClickListener {
            selectedLatLng?.let { latLng ->
                val address = getAddressFromLatLng(latLng)
                val resultIntent = Intent().apply {
                    putExtra("latitude", latLng.latitude)
                    putExtra("longitude", latLng.longitude)
                    putExtra("address", address)
                }
                setResult(RESULT_OK, resultIntent)
                finish()
            }
        }
        if (mode == "pick") {
            binding.btnConfirmLocation.visibility = android.view.View.VISIBLE
        }
    }

    override fun onMapReady(map: GoogleMap) {
        googleMap = map
        val defaultLatLng = LatLng(
            intent.getDoubleExtra("latitude", 12.8797),
            intent.getDoubleExtra("longitude", 121.7740)
        )
        googleMap.moveCamera(CameraUpdateFactory.newLatLngZoom(defaultLatLng, 6f))

        if (mode == "view") {
            googleMap.addMarker(MarkerOptions().position(defaultLatLng).title("Last seen here"))
        }
        if (mode == "pick") {
            googleMap.setOnMapClickListener { latLng ->
                googleMap.clear()
                googleMap.addMarker(MarkerOptions().position(latLng).title("Selected location"))
                selectedLatLng = latLng
            }
        }
        try { googleMap.isMyLocationEnabled = true } catch (e: SecurityException) {}
    }

    private fun getAddressFromLatLng(latLng: LatLng): String {
        return try {
            val geocoder = Geocoder(this, Locale.getDefault())
            val addresses = geocoder.getFromLocation(latLng.latitude, latLng.longitude, 1)
            addresses?.firstOrNull()?.getAddressLine(0) ?: "${latLng.latitude}, ${latLng.longitude}"
        } catch (e: Exception) { "${latLng.latitude}, ${latLng.longitude}" }
    }
}
