document.addEventListener('DOMContentLoaded', () => {
  const activitiesList = document.getElementById('activities-list');
  const activitySelect = document.getElementById('activity');
  const messageDiv = document.getElementById('message');
  const signupForm = document.getElementById('signup-form');

  function showMessage(text, type = 'info') {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.classList.remove('hidden');
    setTimeout(() => messageDiv.classList.add('hidden'), 4000);
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (m) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])
    );
  }

  function renderActivities(data) {
    activitiesList.innerHTML = '';
    // clear select options except placeholder
    Array.from(activitySelect.options).forEach((o, i) => { if (i > 0) o.remove(); });

    Object.entries(data).forEach(([name, info]) => {
      // create card
      const card = document.createElement('div');
      card.className = 'activity-card';
      card.innerHTML = `
        <h4>${escapeHtml(name)}</h4>
        <p class="desc">${escapeHtml(info.description)}</p>
        <p class="schedule"><strong>Schedule:</strong> ${escapeHtml(info.schedule)}</p>
        <p class="capacity"><strong>Capacity:</strong> ${info.participants.length}/${info.max_participants}</p>
        <div class="participants-section">
          <h5>Participants (${info.participants.length})</h5>
          <ul class="participants-list">
            ${info.participants.map(p => `<li class="participant-badge" data-email="${escapeHtml(p)}" data-activity="${escapeHtml(name)}">
              <span>${escapeHtml(p)}</span>
              <button class="delete-btn" type="button" aria-label="Remove ${escapeHtml(p)}">✕</button>
            </li>`).join('')}
          </ul>
        </div>
      `;
      activitiesList.appendChild(card);

      // add option to select
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      activitySelect.appendChild(opt);
    });
  }

  // initial load
  fetch('/activities')
    .then((r) => r.json())
    .then((data) => renderActivities(data))
    .catch((err) => {
      activitiesList.innerHTML = '<p class="error">Failed to load activities.</p>';
      console.error(err);
    });

  // handle delete participant
  activitiesList.addEventListener('click', async (e) => {
    if (e.target.classList.contains('delete-btn')) {
      const badge = e.target.closest('.participant-badge');
      const email = badge.dataset.email;
      const activityName = badge.dataset.activity;

      try {
        const resp = await fetch(`/activities/${encodeURIComponent(activityName)}/unregister?email=${encodeURIComponent(email)}`, {
          method: 'POST'
        });
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          throw new Error(err.detail || 'Unregister failed');
        }
        const payload = await resp.json();
        showMessage(payload.message, 'success');

        // Remove the participant badge from UI
        badge.remove();

        // Update the participants count
        const list = badge.closest('.participants-list');
        const participantsHeader = list.parentElement.querySelector('h5');
        const count = list.children.length;
        participantsHeader.textContent = `Participants (${count})`;

        // Update capacity text
        const card = badge.closest('.activity-card');
        const cap = card.querySelector('.capacity');
        const maxMatch = cap.textContent.match(/\/\s*(\d+)/);
        const max = maxMatch ? parseInt(maxMatch[1], 10) : '';
        cap.innerHTML = `<strong>Capacity:</strong> ${count}/${max}`;
      } catch (err) {
        showMessage(err.message || 'Unregister failed', 'error');
      }
    }
  });

  // handle signup
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const activityName = activitySelect.value;
    if (!activityName) {
      showMessage('Please select an activity', 'error');
      return;
    }
    if (!email) {
      showMessage('Please enter your email', 'error');
      return;
    }

    try {
      const resp = await fetch(`/activities/${encodeURIComponent(activityName)}/signup?email=${encodeURIComponent(email)}`, {
        method: 'POST'
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || 'Signup failed');
      }
      const payload = await resp.json();
      showMessage(payload.message, 'success');

      // Update UI: find the activity card and append participant
      const cards = Array.from(document.querySelectorAll('.activity-card'));
      const card = cards.find(c => c.querySelector('h4') && c.querySelector('h4').textContent === activityName);
      if (card) {
        const list = card.querySelector('.participants-list');
        const li = document.createElement('li');
        li.className = 'participant-badge';
        li.dataset.email = email;
        li.dataset.activity = activityName;
        li.innerHTML = `
          <span>${escapeHtml(email)}</span>
          <button class="delete-btn" type="button" aria-label="Remove ${escapeHtml(email)}">✕</button>
        `;
        list.appendChild(li);

        // update header count
        const participantsHeader = card.querySelector('.participants-section h5');
        const count = list.children.length;
        participantsHeader.textContent = `Participants (${count})`;

        // update capacity text
        const cap = card.querySelector('.capacity');
        const maxMatch = cap.textContent.match(/\/\s*(\d+)/);
        const max = maxMatch ? parseInt(maxMatch[1], 10) : '';
        cap.innerHTML = `<strong>Capacity:</strong> ${count}/${max}`;
      }
    } catch (err) {
      showMessage(err.message || 'Signup failed', 'error');
    }
  });
});
