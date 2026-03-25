package com.animalbase.app.ui.applications
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.animalbase.app.api.RetrofitClient
import com.animalbase.app.databinding.FragmentApplicationsBinding
import com.animalbase.app.models.AdoptionApplication
import com.animalbase.app.utils.gone
import com.animalbase.app.utils.showToast
import com.animalbase.app.utils.visible
import kotlinx.coroutines.launch

class ApplicationsFragment : Fragment() {

    private var _binding: FragmentApplicationsBinding? = null
    private val binding get() = _binding!!
    private val api by lazy { RetrofitClient.getApiService(requireContext()) }
    private val adapter by lazy { ApplicationCardAdapter(::showApplicationDetails) }
    private var applications: List<AdoptionApplication> = emptyList()
    private var selectedStatus: String = "Pending"

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentApplicationsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        binding.rvApplications.layoutManager = LinearLayoutManager(requireContext())
        binding.rvApplications.adapter = adapter

        binding.btnPending.setOnClickListener { selectedStatus = "Pending"; render() }
        binding.btnApproved.setOnClickListener { selectedStatus = "Approved"; render() }
        binding.btnRejected.setOnClickListener { selectedStatus = "Rejected"; render() }
    }

    override fun onResume() {
        super.onResume()
        if (_binding != null) {
            loadApplications()
        }
    }

    private fun loadApplications() {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                binding.progressBar.visible()
                val response = api.getMyApplications()
                if (response.isSuccessful) {
                    applications = response.body().orEmpty()
                    render()
                } else {
                    requireContext().showToast("Failed to load applications")
                }
            } catch (e: Exception) {
                requireContext().showToast(e.message ?: "Failed to load applications")
            } finally {
                binding.progressBar.gone()
            }
        }
    }

    private fun render() {
        val pending = applications.count { it.status == "Pending" }
        val approved = applications.count { it.status == "Approved" }
        val rejected = applications.count { it.status == "Rejected" }

        binding.tvPendingCount.text = pending.toString()
        binding.tvApprovedCount.text = approved.toString()
        binding.tvRejectedCount.text = rejected.toString()

        updateTabState()

        val filtered = applications.filter { it.status == selectedStatus }
        adapter.submitList(filtered)
        binding.emptyState.visibility = if (filtered.isEmpty()) View.VISIBLE else View.GONE
        binding.tvEmptySubtitle.text = when (selectedStatus) {
            "Pending" -> "You haven't submitted any pending applications."
            "Approved" -> "No applications have been approved yet."
            else -> "No applications have been rejected yet."
        }
    }

    private fun updateTabState() {
        val activeColor = com.animalbase.app.R.color.primary
        val inactiveColor = com.animalbase.app.R.color.primary_light
        val inactiveText = com.animalbase.app.R.color.text_secondary
        val activeText = com.animalbase.app.R.color.text_on_primary

        listOf(
            binding.btnPending to "Pending",
            binding.btnApproved to "Approved",
            binding.btnRejected to "Rejected"
        ).forEach { (button, status) ->
            val active = selectedStatus == status
            button.setBackgroundColor(requireContext().getColor(if (active) activeColor else inactiveColor))
            button.setTextColor(requireContext().getColor(if (active) activeText else inactiveText))
        }
    }

    private fun showApplicationDetails(app: AdoptionApplication) {
        ApplicationDetailsDialog.show(requireContext(), app)
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
