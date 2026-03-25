package com.animalbase.app.ui.home

import android.content.Intent
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.os.Bundle
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.PopupWindow
import androidx.core.widget.doAfterTextChanged
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.animalbase.app.api.RetrofitClient
import com.animalbase.app.databinding.FragmentHomeBinding
import com.animalbase.app.databinding.ViewNotificationsPopoverBinding
import com.animalbase.app.models.Notification
import com.animalbase.app.ui.adoption.PetAdapter
import com.animalbase.app.ui.adoption.PetDetailActivity
import com.animalbase.app.ui.missing.MissingPetAdapter
import com.animalbase.app.ui.missing.MissingPetDetailActivity
import com.animalbase.app.ui.notifications.NotificationListAdapter
import com.animalbase.app.ui.profile.ProfileActivity
import com.animalbase.app.utils.ImageLoader
import com.animalbase.app.utils.NotificationNavigator
import com.animalbase.app.utils.NotificationStateStore
import com.animalbase.app.utils.SessionManager
import com.animalbase.app.utils.gone
import com.animalbase.app.utils.visible
import kotlinx.coroutines.launch
import kotlin.math.roundToInt

class HomeFragment : Fragment() {

    companion object {
        private const val HOME_FEATURED_PET_LIMIT = 8
    }

    private var _binding: FragmentHomeBinding? = null
    private val binding get() = _binding!!
    private val api by lazy { RetrofitClient.getApiService(requireContext()) }
    private val session by lazy { SessionManager(requireContext()) }
    private val notificationStore by lazy { NotificationStateStore(requireContext()) }
    private var selectedPetType: String? = null
    private var currentSearchQuery: String = ""
    private var latestNotifications: List<Notification> = emptyList()
    private var notificationPopup: PopupWindow? = null
    private var notificationPopoverBinding: ViewNotificationsPopoverBinding? = null
    private var notificationPopoverAdapter: NotificationListAdapter? = null

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentHomeBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupUI()
        loadData()
        binding.swipeRefresh.setOnRefreshListener { loadData() }
    }

    override fun onResume() {
        super.onResume()
        if (_binding != null) {
            loadPets()
            loadNotifications()
        }
    }

    private fun setupUI() {
        // Set user name
        val user = session.getUser()
        binding.tvUserName.text = user?.fullName ?: "AnimalBase"
        user?.profilePhotoUrl?.let {
            ImageLoader.loadProfileImage(requireContext(), it, binding.ivProfileAvatar)
        }

        // Profile click
        binding.ivProfileAvatar.setOnClickListener {
            startActivity(Intent(requireContext(), ProfileActivity::class.java))
        }

        binding.btnNotifications.setOnClickListener {
            toggleNotificationsPopover()
        }

        // See all pets
        binding.tvSeeAllPets.setOnClickListener {
            (requireActivity() as? MainActivity)?.navigateToAdoptionCatalog()
        }

        // See all missing
        binding.tvSeeAllMissing.setOnClickListener {
            (requireActivity() as? MainActivity)?.navigateToTab(NotificationNavigator.TAB_PET_FINDER)
        }

        // Category chips
        binding.chipGroupCategories.setOnCheckedStateChangeListener { _, checkedIds ->
            selectedPetType = when {
                checkedIds.contains(com.animalbase.app.R.id.chipDog) -> "Dogs"
                checkedIds.contains(com.animalbase.app.R.id.chipCat) -> "Cats"
                checkedIds.contains(com.animalbase.app.R.id.chipBird) -> "Birds"
                checkedIds.contains(com.animalbase.app.R.id.chipSmall) -> "Small Animals"
                checkedIds.contains(com.animalbase.app.R.id.chipReptile) -> "Reptiles"
                checkedIds.contains(com.animalbase.app.R.id.chipOther) -> "Other"
                else -> null
            }
            loadPets()
        }

        binding.etSearch.doAfterTextChanged { text ->
            currentSearchQuery = text?.toString().orEmpty()
            loadPets()
        }

        // Setup recycler views
        binding.rvFeaturedPets.layoutManager =
            LinearLayoutManager(requireContext(), LinearLayoutManager.HORIZONTAL, false)
        binding.rvMissingPets.layoutManager = LinearLayoutManager(requireContext())
    }

    private fun loadData() {
        loadPets()
        loadMissingPets()
        loadNotifications()
    }

    private fun loadPets() {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = api.getPets()
                if (response.isSuccessful) {
                    val availablePets = response.body().orEmpty().filter { it.status == "Available" }
                    val pets = filterFeaturedPets(
                        availablePets,
                        currentSearchQuery,
                        selectedPetType
                    ).take(HOME_FEATURED_PET_LIMIT)
                    binding.rvFeaturedPets.adapter = PetAdapter(pets) { pet ->
                        val intent = Intent(requireContext(), PetDetailActivity::class.java)
                        intent.putExtra("pet_id", pet.petId)
                        startActivity(intent)
                    }
                    val showEmptyState = pets.isEmpty()
                    binding.rvFeaturedPets.visibility = if (showEmptyState) View.GONE else View.VISIBLE
                    binding.tvFeaturedPetsEmptyState.visibility = if (showEmptyState) View.VISIBLE else View.GONE
                    if (showEmptyState) {
                        binding.tvFeaturedPetsEmptyState.text = getString(
                            if (availablePets.isEmpty()) {
                                com.animalbase.app.R.string.featured_pets_all_adopted_message
                            } else {
                                com.animalbase.app.R.string.featured_pets_no_results_message
                            }
                        )
                    }
                }
                binding.swipeRefresh.isRefreshing = false
            } catch (e: Exception) {
                binding.swipeRefresh.isRefreshing = false
            }
        }
    }

    private fun loadMissingPets() {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = api.getMissingPets(status = "Missing")
                if (response.isSuccessful) {
                    val currentUser = session.getUser()
                    val normalizedUserEmail = currentUser?.email?.trim()?.lowercase().orEmpty()
                    val pets = response.body().orEmpty().filterNot { pet ->
                        (
                            currentUser != null &&
                                pet.reportedById != null &&
                                currentUser.effectiveUserId == pet.reportedById
                            ) ||
                            (
                                normalizedUserEmail.isNotBlank() &&
                                    pet.ownerEmail?.trim()?.lowercase() == normalizedUserEmail
                                )
                    }
                    val adapter = MissingPetAdapter(
                        onView = { pet ->
                            val intent = Intent(requireContext(), MissingPetDetailActivity::class.java)
                            intent.putExtra("missing_pet_id", pet.missingPetId)
                            startActivity(intent)
                        },
                        onSighting = { pet ->
                            val intent = Intent(requireContext(), com.animalbase.app.ui.report.ReportSightingActivity::class.java)
                            intent.putExtra("missing_pet_id", pet.missingPetId)
                            startActivity(intent)
                        }
                    )
                    adapter.submitList(pets)
                    binding.rvMissingPets.adapter = adapter
                }
            } catch (e: Exception) { }
        }
    }

    private fun loadNotifications() {
        val userId = session.getUser()?.effectiveUserId ?: run {
            latestNotifications = emptyList()
            renderNotificationBadge()
            renderNotificationPopover()
            return
        }

        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = api.getNotifications(scope = "user")
                if (response.isSuccessful) {
                    latestNotifications = notificationStore
                        .applyVisibleState(userId, response.body()?.notifications ?: emptyList())
                        .sortedByDescending { it.createdAt ?: "" }

                    renderNotificationBadge()
                    renderNotificationPopover()
                }
            } catch (_: Exception) {
            }
        }
    }

    private fun toggleNotificationsPopover() {
        if (notificationPopup?.isShowing == true) {
            notificationPopup?.dismiss()
            return
        }
        showNotificationsPopover(binding.btnNotifications)
    }

    private fun showNotificationsPopover(anchor: View) {
        val popoverBinding = ViewNotificationsPopoverBinding.inflate(layoutInflater)
        val adapter = NotificationListAdapter(
            showMarkReadAction = true,
            onItemClick = { notification ->
                markNotificationAsRead(notification)
                notificationPopup?.dismiss()
                NotificationNavigator.openNotificationTarget(requireContext(), notification)
            },
            onMarkRead = { notification ->
                markNotificationAsRead(notification)
            },
            onClear = { notification ->
                clearNotification(notification)
            }
        )

        notificationPopoverBinding = popoverBinding
        notificationPopoverAdapter = adapter

        popoverBinding.rvPopoverNotifications.layoutManager = LinearLayoutManager(requireContext())
        popoverBinding.rvPopoverNotifications.adapter = adapter
        popoverBinding.btnPopoverMarkAllRead.setOnClickListener { markAllNotificationsAsRead() }
        popoverBinding.btnPopoverClearAllRead.setOnClickListener { clearAllReadNotifications() }
        popoverBinding.btnPopoverViewAll.setOnClickListener {
            notificationPopup?.dismiss()
            NotificationNavigator.openNotificationCenter(requireContext())
        }
        popoverBinding.progressPopover.gone()

        val popupWidth = popupWidthPx()
        notificationPopup = PopupWindow(
            popoverBinding.root,
            popupWidth,
            ViewGroup.LayoutParams.WRAP_CONTENT,
            true
        ).apply {
            isOutsideTouchable = true
            elevation = dpToPx(12).toFloat()
            setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
            setOnDismissListener {
                notificationPopoverBinding = null
                notificationPopoverAdapter = null
                notificationPopup = null
            }
        }

        renderNotificationPopover()
        notificationPopup?.showAsDropDown(anchor, 0, dpToPx(8), Gravity.END)
    }

    private fun renderNotificationBadge() {
        val unreadCount = latestNotifications.count { !it.isRead }
        if (unreadCount > 0) {
            binding.tvNotificationBadge.text = if (unreadCount > 99) "99+" else unreadCount.toString()
            binding.tvNotificationBadge.visible()
        } else {
            binding.tvNotificationBadge.gone()
        }
    }

    private fun renderNotificationPopover() {
        val popoverBinding = notificationPopoverBinding ?: return
        val adapter = notificationPopoverAdapter ?: return
        val recentNotifications = latestNotifications.take(5)
        val unreadCount = latestNotifications.count { !it.isRead }
        val readCount = latestNotifications.count { it.isRead }

        popoverBinding.tvPopoverUnreadCount.text =
            if (unreadCount == 1) "1 unread" else "$unreadCount unread"
        popoverBinding.btnPopoverMarkAllRead.isEnabled = unreadCount > 0
        popoverBinding.btnPopoverMarkAllRead.alpha = if (unreadCount > 0) 1f else 0.5f
        popoverBinding.btnPopoverClearAllRead.isEnabled = readCount > 0
        popoverBinding.btnPopoverClearAllRead.alpha = if (readCount > 0) 1f else 0.5f
        popoverBinding.tvPopoverEmpty.visibility =
            if (recentNotifications.isEmpty()) View.VISIBLE else View.GONE
        popoverBinding.rvPopoverNotifications.visibility =
            if (recentNotifications.isEmpty()) View.GONE else View.VISIBLE

        adapter.submitList(recentNotifications)
    }

    private fun markNotificationAsRead(notification: Notification) {
        val userId = session.getUser()?.effectiveUserId ?: return
        if (!notificationStore.isRead(userId, notification.id)) {
            notificationStore.markAsRead(userId, notification.id)
            latestNotifications = latestNotifications.map { item ->
                if (item.id == notification.id) item.copy(isRead = true) else item
            }
            renderNotificationBadge()
            renderNotificationPopover()
        }
    }

    private fun clearNotification(notification: Notification) {
        val userId = session.getUser()?.effectiveUserId ?: return
        notificationStore.clearNotification(userId, notification.id)
        latestNotifications = latestNotifications.filterNot { it.id == notification.id }
        renderNotificationBadge()
        renderNotificationPopover()
    }

    private fun clearAllReadNotifications() {
        val userId = session.getUser()?.effectiveUserId ?: return
        val readIds = latestNotifications.filter { it.isRead }.map { it.id }
        if (readIds.isEmpty()) return

        notificationStore.clearNotifications(userId, readIds)
        latestNotifications = latestNotifications.filterNot { it.isRead }
        renderNotificationBadge()
        renderNotificationPopover()
    }

    private fun markAllNotificationsAsRead() {
        val userId = session.getUser()?.effectiveUserId ?: return
        val unreadIds = latestNotifications.filter { !it.isRead }.map { it.id }
        if (unreadIds.isEmpty()) return

        notificationStore.markAllAsRead(userId, unreadIds)
        latestNotifications = latestNotifications.map { it.copy(isRead = true) }
        renderNotificationBadge()
        renderNotificationPopover()
    }

    private fun filterPetsBySearch(pets: List<com.animalbase.app.models.Pet>, query: String): List<com.animalbase.app.models.Pet> {
        val term = query.trim().lowercase()
        if (term.isBlank()) return pets

        return pets
            .filter { pet ->
                listOfNotNull(pet.petName, pet.breed, pet.petType)
                    .any { value -> value.lowercase().contains(term) }
            }
            .sortedWith(
                compareByDescending<com.animalbase.app.models.Pet> {
                    it.petName.trim().lowercase() == term
                }.thenBy {
                    it.petName.lowercase()
                }
            )
    }

    private fun filterFeaturedPets(
        pets: List<com.animalbase.app.models.Pet>,
        query: String,
        selectedType: String?
    ): List<com.animalbase.app.models.Pet> {
        val normalizedType = selectedType?.trim()?.lowercase()
        val typeFilteredPets = pets.filter { pet ->
            if (normalizedType.isNullOrBlank()) {
                return@filter true
            }

            val petType = pet.petType.trim().lowercase()
            petType == normalizedType ||
                (normalizedType == "other" && petType == "others") ||
                (normalizedType == "others" && petType == "other")
        }

        return filterPetsBySearch(typeFilteredPets, query)
    }

    private fun popupWidthPx(): Int {
        val screenWidth = resources.displayMetrics.widthPixels
        return minOf(screenWidth - dpToPx(24), dpToPx(360))
    }

    private fun dpToPx(value: Int): Int = (value * resources.displayMetrics.density).roundToInt()

    override fun onDestroyView() {
        notificationPopup?.dismiss()
        notificationPopoverBinding = null
        notificationPopoverAdapter = null
        notificationPopup = null
        super.onDestroyView()
        _binding = null
    }
}
