document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      // Reset activity select options (keep the placeholder)
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants HTML (show readable names + initials avatar)
        const participantsList = Array.isArray(details.participants) ? details.participants : [];

        function formatEmailToName(email) {
          const local = String(email).split('@')[0];
          const parts = local.split(/[_\.\-]+/).filter(Boolean);
          return parts.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
        }

        function formatParticipant(p) {
          if (p && typeof p === 'object') {
            if (p.name) return p.name;
            if (p.full_name) return p.full_name;
            if (p.email) return formatEmailToName(p.email);
          }
          if (typeof p === 'string') {
            if (p.includes('@')) return formatEmailToName(p);
            return p;
          }
          return '';
        }

        function getInitials(name) {
          const s = String(name || '').trim();
          if (!s) return '';
          const parts = s.split(/\s+/).filter(Boolean);
          if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
          return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }

        function escapeHtml(str) {
          return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
        }

        let participantsHtml = '<div class="participants-section"><p><strong>Participantes:</strong></p>';
        if (participantsList.length > 0) {
          participantsHtml += '<ul class="participants-list">' + participantsList.map(p => {
            // Prefer the raw email when available; fall back to a readable string
            let emailStr = '';
            if (typeof p === 'string' && p.includes('@')) {
              emailStr = p;
            } else if (p && typeof p === 'object' && p.email) {
              emailStr = p.email;
            } else if (typeof p === 'string') {
              emailStr = p;
            } else if (p && typeof p === 'object') {
              emailStr = p.name || p.full_name || '';
            }
            return `<li class="participant-item"><span>${escapeHtml(emailStr)}</span><button class="participant-delete-btn" data-activity="${escapeHtml(name)}" data-email="${escapeHtml(emailStr)}" title="Remove participant">✕</button></li>`;
          }).join('') + '</ul>';
        } else {
          participantsHtml += '<p class="no-participants">Aún no hay participantes</p>';
        }
        participantsHtml += '</div>';

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${participantsHtml}
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners for delete buttons
      document.querySelectorAll('.participant-delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.preventDefault();
          const activityName = btn.dataset.activity;
          const email = btn.dataset.email;

          if (confirm(`Are you sure you want to remove ${email} from ${activityName}?`)) {
            try {
              const response = await fetch(
                `/activities/${encodeURIComponent(activityName)}/unregister?email=${encodeURIComponent(email)}`,
                {
                  method: "DELETE",
                }
              );

              if (response.ok) {
                messageDiv.textContent = `${email} has been removed from ${activityName}`;
                messageDiv.className = "success";
                messageDiv.classList.remove("hidden");
                
                // Hide message after 5 seconds
                setTimeout(() => {
                  messageDiv.classList.add("hidden");
                }, 5000);

                // Refresh the activities list
                fetchActivities();
              } else {
                const result = await response.json();
                messageDiv.textContent = result.detail || "Failed to remove participant";
                messageDiv.className = "error";
                messageDiv.classList.remove("hidden");
              }
            } catch (error) {
              messageDiv.textContent = "Failed to remove participant. Please try again.";
              messageDiv.className = "error";
              messageDiv.classList.remove("hidden");
              console.error("Error removing participant:", error);
            }
          }
        });
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
          // Refresh the activities list to show the new participant
          fetchActivities();
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
