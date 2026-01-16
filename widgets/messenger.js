  if (typeof fc_cfg === "undefined") { fc_cfg = window.fc_cfg || {}; }

    // Get current user's timezone offset safely
const fc_offsetMinutes = new Date().getTimezoneOffset();

// Convert to ±HH:MM format
function fc_formatOffset_fnc(mins) {
  const sign = mins <= 0 ? '+' : '-';
  const abs = Math.abs(mins);
  const hours = String(Math.floor(abs / 60)).padStart(2, '0');
  const minutes = String(abs % 60).padStart(2, '0');
  return `${sign}${hours}:${minutes}`;
}

let fc_offset = fc_formatOffset_fnc(fc_offsetMinutes);

        let fc_initialized = false; 
        fc_base_url = 'https://widgets.fishingcab.com/Widgets/';
        fc_cdn_url = 'https://cdn-widgets.fishingcab.com/';
        let fc_push_users = {};
        let fc_push_rooms = {};
        let fc_push_nearby = {};
        let fc_push_chats = {};
        let fc_push_messages = {};
        let fc_push_notifications = {};
        let fc_user_id = 0;
        let fc_latitude = window.fc_lat || 0;
        let fc_longitude = window.fc_lon || 0;
        let fc_self_info = {};
        if (typeof fc_cfg === "undefined") { let fc_cfg = window.fc_cfg || {}; }
        let fc_missingChats = {};
        let fc_missingUsers = {};        
        if (!window.fc_unread_messages) {
          window.fc_unread_messages = new Map();
        }
        if (!window.fc_unseen_notifications) {
          window.fc_unseen_notifications = 0;
        }
        if (!window.fc_sound_muted) {
          window.fc_sound_muted = false;
        }

       

       
function fc_safeText_fnc(text) {
  const span = document.createElement("span");
  span.textContent = text ?? "";
  return span.textContent;
}

function fc_el_fnc(tag, className, attrs = {}) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  for (const k in attrs) {
    if (k === "text") el.textContent = attrs[k];
    else el.setAttribute(k, attrs[k]);
  }
  return el;
}

const fc_qs_fnc = (sel, root = document) => root.querySelector(sel);
const fc_qsa_fnc = (sel, root = document) => root.querySelectorAll(sel);

function fc_retry_lookup_fnc(store, missing, id, max = 3) {
  if (store[id]) {
    delete missing[id];
    return store[id];
  }
  missing[id] = (missing[id] || 0) + 1;
  if (missing[id] >= max) {
    delete store[id];
    delete missing[id];
  }
  return null;
}


const fc_removeElement_fnc = (fc_el, fc_duration = 300) => {
  if (!(fc_el instanceof Element)) return; // ensure it's a DOM element

  // Apply transition styles
  fc_el.style.transition = `opacity ${fc_duration}ms ease, transform ${fc_duration}ms ease`;
  fc_el.style.opacity = "0";
  fc_el.style.transform = "scale(0.95)";

  // Define a safe cleanup function
  const cleanup = () => {
    if (fc_el && fc_el.parentNode) {
      fc_el.remove();
    }
  };

  // Listen for transition end (fires once)
  fc_el.addEventListener("transitionend", cleanup, { once: true });

  // Fallback: force removal after duration + buffer
  setTimeout(cleanup, fc_duration + 100);
};


function fc_fragment_fnc() {
  return document.createDocumentFragment();
}

function fc_toggle_controls_fnc(fc_controls, fc_disabled) {
  fc_controls.forEach(fc_el => (fc_el.disabled = fc_disabled));
}


async function fc_doUpdates_fnc(fc_response, fc_action, fc_user_public_key, fc_user_secret_key) {
  if (!fc_cfg || !fc_cfg.widget_id) return;
    if (!fc_response || fc_response.status !== true) {
        fc_alert_fnc('Warning: Invalid response', 'warning');
        return false;
    }

    const data = fc_response.data || {};

    // ----------------- USERS -----------------
    if (data.users && Object.keys(data.users).length > 0) {
  const fc_users = data.users;

  // Merge new users into existing fc_push_users without overwriting everything
  fc_push_users = {
    ...fc_push_users,
    ...fc_users
  };

  const usersDB = new IndexedDBWrapper(fc_user_public_key, "users");
  await usersDB.init();

  const savePromises = [];

  for (const [key, value] of Object.entries(fc_users)) {
    if (!value || !value.user_id || !value.public_key) continue;

    const userToSave = { id: key, ...value };

    // Update self info if this is the current user
    if (value.public_key === fc_user_public_key) {
      fc_self_info = value;
      fc_user_id = value.user_id;

      // Defer UI update for smoother rendering
      requestAnimationFrame(() => {
        fc_updateSelf_fnc(fc_self_info, fc_user_public_key, fc_user_secret_key);
      });
    }

    // Save user safely
    savePromises.push(
      (async () => {
        try {
          await usersDB.save(userToSave);
        } catch (err) {
        }
      })()
    );
  }

  await Promise.all(savePromises);
}


    // ----------------- ROOMS -----------------
    if (data.rooms && Object.keys(data.rooms).length > 0) {
  const fc_rooms = data.rooms;

  // Merge new rooms into existing fc_push_rooms without overwriting everything
  fc_push_rooms = {
    ...fc_push_rooms,
    ...fc_rooms
  };

  const roomsDB = new IndexedDBWrapper(fc_user_public_key, "rooms");
  await roomsDB.init();

  const savePromises = [];

  for (const [key, value] of Object.entries(fc_rooms)) {
    if (!value || !value.room_id) continue;

    const roomToSave = { id: key, ...value };

    // Wrap room UI update safely
    requestAnimationFrame(async () => {
      await fc_wrap_room_fnc(value, fc_user_public_key, fc_user_secret_key);
    });

    // Save room safely
    savePromises.push(
      (async () => {
        try {
          await roomsDB.save(roomToSave);
        } catch (err) {
        }
      })()
    );
  }

  await Promise.all(savePromises);
}


    // ----------------- NEARBY -----------------
    if (data.nearby && Object.keys(data.nearby).length > 0) {
    const fc_nearby = data.nearby;

    // Remap users by user_id for quick lookup
    const fc_nearby_remapped = Object.fromEntries(
        Object.values(fc_nearby).map(user => [user.user_id, user])
    );

    // Merge into global store
    fc_push_nearby = { ...fc_push_nearby, ...fc_nearby_remapped };

    const container = fc_qs_fnc(`#fc-nearby-${fc_cfg.widget_id}`);
    if (container) container.innerHTML = ''; // clear old list

    const frag = fc_fragment_fnc();

    Object.values(fc_nearby).forEach(async user =>
       await fc_wrap_nearby_fnc(user, frag, fc_user_public_key, fc_user_secret_key)
    );

    if (container && frag.childNodes.length > 0) container.appendChild(frag);
}


setTimeout(async () => {              
  // ----------------- CHATS & MESSAGES -----------------
  if (data.chats && Object.keys(data.chats).length > 0) {
  const fc_chats = data.chats;

  // Merge new chats into existing fc_push_chats without overwriting everything
  fc_push_chats = {
    ...fc_push_chats,
    ...fc_chats
  };

  const chatsDB = new IndexedDBWrapper(fc_user_public_key, "chats");
  await chatsDB.init();


  for (const [chatKey, chatValue] of Object.entries(fc_chats)) {
    if (!chatValue || !chatValue.chat_id) continue;

    try {
      const chatToSave = { id: chatKey, ...chatValue };
      await chatsDB.save(chatToSave);
    } catch (err) {
    }

    let fc_chat_type, fc_recipient;
    if (Number(chatValue.room_id) === 0) {
      fc_chat_type = "user";
      fc_recipient =
        chatValue.user_id === fc_user_id
          ? fc_push_users?.[chatValue.recipient_id]
          : fc_push_users?.[chatValue.user_id];
    } else {
      fc_chat_type = "room";
      fc_recipient = fc_push_rooms?.[chatValue.room_id];
    }

    await fc_chat_update_fnc(chatValue, fc_recipient, fc_user_public_key, fc_user_secret_key);
    await fc_start_chat_fnc(chatValue.chat_id, fc_chat_type, fc_user_public_key, fc_user_secret_key, false);

    const chatMessages = data.messages?.[chatValue.chat_id];
    if (chatMessages && Object.keys(chatMessages).length > 0) {

      const messagesDB = new IndexedDBWrapper(fc_user_public_key, "messages");
      await messagesDB.init();

      const frag = fc_fragment_fnc();
      const savePromises = [];

      for (const [msgKey, msgValue] of Object.entries(chatMessages)) {
        if (msgValue && msgValue.message_id > 0) {
          savePromises.push(
            (async () => {
              try {
                await messagesDB.save({ id: msgKey, ...msgValue });
              } catch (err) {
              }
            })()
          );
          fc_display_message_fnc(msgValue, fc_action, frag, fc_user_public_key, fc_user_secret_key);
        }
      }

      await Promise.all(savePromises);

      const convEl = fc_qs_fnc(`#fc-conversation-${chatValue.chat_id}`);
      if (convEl && frag.childNodes.length > 0) {
        requestAnimationFrame(() => {
          convEl.appendChild(frag);
          convEl.parentElement.scrollTop = convEl.parentElement.scrollHeight;
        });
      }
    }
  }
}
}, 50);


setTimeout(async () => {
if (data.messages && Object.keys(data.messages).length > 0) {

  const messagesDB = new IndexedDBWrapper(fc_user_public_key, "messages");
  await messagesDB.init();

  const messages = data.messages;
  const savePromises = [];
    // Loop over messages keyed by messages_key
    Object.values(messages).forEach(messagesValue => {
      // Loop over each message in this group
      Object.values(messagesValue).forEach(messageValue => {
        savePromises.push(
            (async () => {
              try {
                await messagesDB.save({ id: messageValue.message_id, ...messageValue });
              } catch (err) {
              }
            })()
          );
        fc_display_message_fnc(messageValue, fc_action, null, fc_user_public_key, fc_user_secret_key);
      });
    });

    await Promise.all(savePromises);
  
}
}, 300);


setTimeout(async () => {
if (data.all_push && Object.keys(data.all_push).length > 0) {

  const pushDB = new IndexedDBWrapper(fc_user_public_key, "push");
  await pushDB.init();

  const savePromises = [];

  Object.values(data.all_push).forEach(async pushItem => {

    savePromises.push(
            (async () => {
              try {
                await pushDB.save({ id: pushItem.push_id, ...pushItem });
              } catch (err) {
              }
            })()
          );

   await fc_push_fnc(pushItem, fc_user_public_key, fc_user_secret_key);

     });

     await Promise.all(savePromises);

}
}, 550);


setTimeout(async () => {
if (data.notifications && Object.keys(data.notifications).length > 0) {
  const fc_notifications = data.notifications;

  // Merge new notifications into existing store
  fc_push_notifications = {
    ...fc_push_notifications,
    ...fc_notifications
  };

  const notificationsDB = new IndexedDBWrapper(fc_user_public_key, "notifications");
  await notificationsDB.init();

  const savePromises = [];

  Object.values(fc_notifications).forEach(notification => {
    savePromises.push(
      (async () => {
        try {
          await notificationsDB.save({ id: notification.notification_id, ...notification });
        } catch (err) {
        }
      })()
    );

    // Add to UI
    fc_addNotification_fnc(notification, fc_user_public_key, fc_user_secret_key);
  });

  await Promise.all(savePromises);
}
}, 850);

    return true;
}

function fc_addNotification_fnc(notification, fc_user_public_key, fc_user_secret_key) {
  if (!fc_cfg?.widget_id || !notification) return;

  const widgetId = fc_cfg.widget_id;
  const notifList = document.getElementById(`fc-notifications-${widgetId}`);
  if (!notifList) return;

  const notifId = `fc-notification-${notification.notification_id}`;

  // Prevent duplicate notifications
  if (document.getElementById(notifId)) {
    return;
  }

  const isUnread = Number(notification.notification_status) !== 2;

  // Create list item
  const li = document.createElement("li");
  if (isUnread) li.classList.add(`fc-unread-${widgetId}`);
  li.id = notifId;

  // Text node
  const p = document.createElement("p");
  const content = fc_contentNotification_fnc(notification, fc_user_public_key, fc_user_secret_key);
  if (!content) return;

  p.innerHTML = content; // allow anchor markup
  p.setAttribute("role", "alert");
  li.appendChild(p);

  // Insert at top
  notifList.prepend(li);

  // Attach mouseover handler if not already seen
  if (isUnread) {
    li.addEventListener("mouseover", () => {
      fc_send_tmp_fnc(
        notification.notification_id,
        "seen",
        fc_user_public_key,
        fc_user_secret_key
        );
    }, { once: true }); // only fire once
  }

  // Update unread badge
  if (isUnread) {
    window.fc_unseen_notifications = (window.fc_unseen_notifications || 0) + 1;
    fc_countNotification_fnc(fc_user_public_key, fc_user_secret_key);
  }
}


function fc_contentNotification_fnc(fc_notification, fc_user_public_key, fc_user_secret_key) {
  if (!fc_cfg?.widget_id || !fc_notification) return "";

  const fc_parent_type = fc_notification.parent_type;

  switch (fc_parent_type) {
    case "received_chat_request": {
      const fc_userValue = fc_push_users?.[fc_notification.parent_id];
      if (!fc_userValue) {
        fc_missingUsers[fc_notification.parent_id] = (fc_missingUsers[fc_notification.parent_id] || 0) + 1;
        if (fc_missingUsers[fc_notification.parent_id] >= 3) {
          delete fc_push_users[fc_notification.parent_id];
          delete fc_missingUsers[fc_notification.parent_id];
        }
        return "";
      }
      delete fc_missingUsers[fc_notification.parent_id];
        // Decide link type
        let linkType = "Profile";
        let showRequest = false;

        if (fc_userValue.blocked === 0 && fc_userValue.chat_request === 1) {
          linkType = "Chat Request";
          showRequest = true;
        }

        return `
          <a href="javascript:void(0)" 
            onclick="fc_view_profile_fnc('${linkType}', '${fc_userValue.user_id}', false, ${showRequest}, '${fc_user_public_key}', '${fc_user_secret_key}')">
            ${fc_userValue.nickname}
          </a> sent you a chat request.
        `;
    }
          
    case "accept_chat_request": {
      const fc_userValue = fc_push_users?.[fc_notification.parent_id];
      if (!fc_userValue) {
        fc_missingUsers[fc_notification.parent_id] = (fc_missingUsers[fc_notification.parent_id] || 0) + 1;
        if (fc_missingUsers[fc_notification.parent_id] >= 3) {
          delete fc_push_users[fc_notification.parent_id];
          delete fc_missingUsers[fc_notification.parent_id];
        }
        return "";
      }
      delete fc_missingUsers[fc_notification.parent_id];
      return `<a href="javascript:void(0)" onclick="fc_view_profile_fnc('Profile', '${fc_userValue.user_id}', false, false, '${fc_user_public_key}', '${fc_user_secret_key}')">${fc_userValue.nickname}</a> accepted your chat request.`;
    }

    default:
      return "";
  }
}

function fc_countNotification_fnc(fc_user_public_key, fc_user_secret_key) {
  if (!fc_cfg?.widget_id) return false;

  const widgetId = fc_cfg.widget_id;
  const notifBadge = document.getElementById(`fc-notifications-badge-${widgetId}`);
  const notifIcon = document.getElementById(`fc-notifications-icon-${widgetId}`);
  if (!notifBadge || !notifIcon) return false;

  const unseenCount = Number(window.fc_unseen_notifications) || 0;

  if (unseenCount > 0) {
    notifBadge.textContent = unseenCount;
    notifBadge.classList.add(`fc-badge-${widgetId}`);
    notifBadge.style.display = "inline-block";
    notifIcon.classList.add(`fc-unread-${widgetId}`);
  } else {
    notifBadge.textContent = "";
    notifBadge.classList.remove(`fc-badge-${widgetId}`);
    notifBadge.style.display = "none";
    notifIcon.classList.remove(`fc-unread-${widgetId}`);
    window.fc_unseen_notifications = 0; // reset counter
  }

  return true;
}



async function fc_push_fnc(fc_push, fc_user_public_key, fc_user_secret_key) {
    const fc_pushItem_parent_type = fc_push.parent_type;

    switch (fc_pushItem_parent_type) {

      case "room_exit":
      case "room_admin":
      case "room_join": {

        /* ==========================
          USER LOOKUP (SAFE)
        ========================== */
        const fc_userId = fc_push.sub_id;
        const fc_userValue = fc_push_users?.[fc_userId];

        if (!fc_userValue) {
          fc_missingUsers[fc_userId] = (fc_missingUsers[fc_userId] || 0) + 1;

          if (fc_missingUsers[fc_userId] >= 3) {
            delete fc_push_users[fc_userId];
            delete fc_missingUsers[fc_userId];
            return true;
          }
          return false;
        }

        delete fc_missingUsers[fc_userId];

        /* ==========================
          CHAT LOOKUP (SAFE)
        ========================== */
        const fc_chatId = fc_push.parent_id;
        const fc_chatValue = fc_push_chats?.[fc_chatId];

        if (!fc_chatValue) {
          fc_missingChats[fc_chatId] = (fc_missingChats[fc_chatId] || 0) + 1;

          if (fc_missingChats[fc_chatId] >= 3) {
            delete fc_push_chats[fc_chatId];
            delete fc_missingChats[fc_chatId];
            return true;
          }
          return false;
        }

        delete fc_missingChats[fc_chatId];

        /* ==========================
          SYSTEM MESSAGE TEXT
        ========================== */
        let fc_systemMsg = "";

        if (fc_pushItem_parent_type === "room_exit") {
          fc_systemMsg = "left the room";
        } else if (fc_pushItem_parent_type === "room_admin") {
          fc_systemMsg = "is now an admin of the room";
        } else if (fc_pushItem_parent_type === "room_join") {
          fc_systemMsg = "has joined the room";
        }

        /* ==========================
          SYSTEM MESSAGE OBJECT
        ========================== */
        const fc_message = {
          message_id: fc_push.push_id,
          chat_id: fc_chatId,
          user_id: fc_userId,
          message_type: "system",
          message_content: `${fc_userValue.nickname} ${fc_systemMsg}`
        };

        fc_display_message_fnc(
          fc_message,
          "system",
          null,
          fc_user_public_key,
          fc_user_secret_key
        );

        return true;
      }


      case "chat_request":{

          // Get user info from global store
         const fc_userValue = fc_push_users?.[fc_push.parent_id];

      if (!fc_userValue) {
           // Increment missing counter
          fc_missingUsers[fc_push.parent_id] = (fc_missingUsers[fc_push.parent_id] || 0) + 1;

          if (fc_missingUsers[fc_push.parent_id] >= 3) {
            // Still missing on second call → delete
            delete fc_push_users[fc_push.parent_id];
            delete fc_missingUsers[fc_push.parent_id]; // cleanup counter
            return true;
          }
          // First time missing → just return false
          return false;
        }

        delete fc_missingUsers[fc_push.parent_id];

          fc_sound_fnc("notification");
          fc_view_profile_fnc('New Chat Request', fc_push.parent_id, false, true, fc_user_public_key, fc_user_secret_key);
          
           // Wrap the timeout in a Promise so callers can await
            await new Promise(resolve => {
              setTimeout(() => {
                resolve(true);
              }, 1000);
            });

          return true; // success
        }

      case "chat_accept": {

      const fc_userValue = fc_push_users?.[fc_push.parent_id];

      if (!fc_userValue) {
           // Increment missing counter
          fc_missingUsers[fc_push.parent_id] = (fc_missingUsers[fc_push.parent_id] || 0) + 1;

          if (fc_missingUsers[fc_push.parent_id] >= 3) {
            // Still missing on second call → delete
            delete fc_push_users[fc_push.parent_id];
            delete fc_missingUsers[fc_push.parent_id]; // cleanup counter
            return true;
          }
          // First time missing → just return false
          return false;
        }

        delete fc_missingUsers[fc_push.parent_id];
        
      fc_view_profile_fnc('Chat Request Accepted', fc_push.parent_id, false, false, fc_user_public_key, fc_user_secret_key);

        // Wrap the timeout in a Promise so callers can await
      await new Promise(resolve => {
        setTimeout(() => {
          resolve(true);
        }, 1000);
      });

      return true; // success
    }

        case "chat_start":
        case "chat_update": {

          // Get chat info from global store
          const fc_chatValue = fc_push_chats?.[fc_push.parent_id];

          if (!fc_chatValue) {
           // Increment missing counter
          fc_missingChats[fc_push.parent_id] = (fc_missingChats[fc_push.parent_id] || 0) + 1;

          if (fc_missingChats[fc_push.parent_id] >= 3) {
            // Still missing on second call → delete
            delete fc_push_chats[fc_push.parent_id];
            delete fc_missingChats[fc_push.parent_id]; // cleanup counter
            return true;
          }
          // First time missing → just return false
          return false;
        }

        delete fc_missingChats[fc_push.parent_id];

          if (fc_push.parent_type === 'chat_start') { 
            fc_sound_fnc("notification"); 
          }

          let fc_chat_type, fc_recipient;

          // Determine if it's a user-to-user chat or a room chat
          if (Number(fc_chatValue.room_id) === 0) {
            fc_chat_type = "user";

            // Determine the recipient: if current user is user_id, recipient is recipient_id, else vice versa
            fc_recipient =
              fc_chatValue.user_id === fc_user_id
                ? fc_push_users?.[fc_chatValue.recipient_id]
                : fc_push_users?.[fc_chatValue.user_id];
          } else {
            fc_chat_type = "room";
            fc_recipient = fc_push_rooms?.[fc_chatValue.room_id];
          }

          // Update chat metadata/UI
          fc_chat_update_fnc(
            fc_chatValue,
            fc_recipient,
            fc_user_public_key,
            fc_user_secret_key
          );

          // Start chat window/session
          fc_start_chat_fnc(
            fc_push.parent_id,
            fc_chat_type,
            fc_user_public_key,
            fc_user_secret_key,
            false // do not auto-focus or extra flags
          );

          // Wrap the timeout in a Promise so callers can await
      await new Promise(resolve => {
        setTimeout(() => {
          resolve(true);
        }, 1000);
      });

          return true; // success
        }

      case "chat_remove":{

         // Get chat info from global store
          const fc_chatValue = fc_push_chats?.[fc_push.parent_id];

          if (!fc_chatValue) {
           // Increment missing counter
          fc_missingChats[fc_push.parent_id] = (fc_missingChats[fc_push.parent_id] || 0) + 1;

          if (fc_missingChats[fc_push.parent_id] >= 3) {
            // Still missing on second call → delete
            delete fc_push_chats[fc_push.parent_id];
            delete fc_missingChats[fc_push.parent_id]; // cleanup counter
            return true;
          }
          // First time missing → just return false
          return false;
        }

        delete fc_missingChats[fc_push.parent_id];

      const fc_formEl = document.getElementById(`fc-input-${fc_push.parent_id}`);
      if (!fc_formEl) return false; // fail if form not found

      const fc_controls = Array.from(
        fc_formEl.querySelectorAll(":scope input, :scope button, :scope textarea, :scope select")
      );

      fc_toggle_controls_fnc(fc_controls, true);

      const fc_chatWin = `#fc-chat-win-${fc_push.parent_id}`;
      const fc_chat  = `#fc-chat-${fc_push.parent_id}`;

      const fc_chatWinEl = fc_qs_fnc(fc_chatWin);
      if (!fc_chatWinEl) return false; 
      fc_removeElement_fnc(fc_chatWinEl, 300)

        const fc_chatEl = fc_qs_fnc(fc_chat);
        if (!fc_chatEl) return false; 
        fc_removeElement_fnc(fc_chatEl, 300)
      

      // Wrap the timeout in a Promise so callers can await
      await new Promise(resolve => {
        setTimeout(() => {
          resolve(true);
        }, 1000);
      });

      return true; // success
    }
    case "notification_remove": {

      const notifSelector = `#fc-notification-${fc_push.parent_id}`;

      const notifEl = fc_qs_fnc(notifSelector);
      if (notifEl) {
        fc_removeElement_fnc(notifEl, 300);
      }

      return true; // success
    }

        case "messages_remove": {

       // Get chat info from global store
          const fc_chatValue = fc_push_chats?.[fc_push.parent_id];

          if (!fc_chatValue) {
           // Increment missing counter
          fc_missingChats[fc_push.parent_id] = (fc_missingChats[fc_push.parent_id] || 0) + 1;

          if (fc_missingChats[fc_push.parent_id] >= 3) {
            // Still missing on second call → delete
            delete fc_push_chats[fc_push.parent_id];
            delete fc_missingChats[fc_push.parent_id]; // cleanup counter
            return true;
          }
          // First time missing → just return false
          return false;
        }

        delete fc_missingChats[fc_push.parent_id];

      const fc_formEl = document.getElementById(`fc-input-${fc_push.parent_id}`);
      if (!fc_formEl) return false; // fail if form not found

      const fc_controls = Array.from(
        fc_formEl.querySelectorAll(":scope input, :scope button, :scope textarea, :scope select")
      );

      fc_toggle_controls_fnc(fc_controls, true);

      const convSelector = `#fc-conversation-${fc_push.parent_id}`;
      const msgSelector  = `.user-${fc_push.sub_id}`;

      const previewEl = fc_qs_fnc(`#fc-preview-${fc_push.parent_id}`);
      if (previewEl) previewEl.innerHTML = '';

      const convEl = fc_qs_fnc(convSelector);
      if (convEl) {
        const msgEls = fc_qsa_fnc(msgSelector, convEl);
        msgEls.forEach(fc_msgEl => fc_removeElement_fnc(fc_msgEl, 300));
      }

      // Wrap the timeout in a Promise so callers can await
      await new Promise(resolve => {
        setTimeout(() => {
          fc_toggle_controls_fnc(fc_controls, false);
          resolve(true);
        }, 1000);
      });

      return true; // success
    }

        default:
      return false;
      
      }
}


function fc_ensureMessengerStyles_fnc() {
  if (!fc_cfg || !fc_cfg.widget_id) return;
  if (document.getElementById(`fc-messenger-styles-${fc_cfg.widget_id}`)) return;
  const fc_style = document.createElement('style');
  fc_style.id = `fc-messenger-styles-${fc_cfg.widget_id}`;
  fc_style.textContent = `

  .fc-chat-dock-${fc_cfg.widget_id},
.fc-messenger-window-${fc_cfg.widget_id} {
  will-change: transform, opacity;
  contain: layout style paint;
}

    /* Window */
    .fc-messenger-window-${fc_cfg.widget_id} {
      position: fixed;
      bottom: 80px;
      right: 20px;
      width: 320px;
      height: 80vh;
      max-width: 95vw;      
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      border-radius: 10px;
      box-shadow: 0 4px 16px color-mix(in srgb, ${fc_cfg.accent_color} 40%, black);
      z-index: 9999;
      background: ${fc_cfg.screen_bg_color};
      color: ${fc_cfg.screen_text_color};
      overflow: hidden;
        opacity: 1;
  transform: scale(1);
  transition: height 0.4s ease, opacity 0.3s ease, transform 0.3s ease;
    }

  .fc-messenger-window-${fc_cfg.widget_id}.fc-hidden-${fc_cfg.widget_id} {
  height: 0;              /* smoothly collapse */
  opacity: 0;             /* fade out */
  transform: scale(0.95); /* slight shrink */
  pointer-events: none;   /* disable clicks */
}

 .fc-messenger-window-${fc_cfg.widget_id} .fc-header-${fc_cfg.widget_id} {
  background: ${fc_cfg.accent_color};
  color: ${fc_cfg.accent_text_color};
  padding: 10px;
  font-weight: 600;
}

/* Online */
.fc-messenger-window-${fc_cfg.widget_id} img.fc-online-${fc_cfg.widget_id}, 
.fc-dialog-overlay-${fc_cfg.widget_id} img.fc-online-${fc_cfg.widget_id}, 
.fc-chat-dock-${fc_cfg.widget_id} img.fc-online-${fc_cfg.widget_id} {
  border: 2px solid #2ecc71;
  box-sizing: border-box;
  box-shadow: 0 0 4px rgba(46, 204, 113, 0.6);
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

/* Away */
.fc-messenger-window-${fc_cfg.widget_id} img.fc-away-${fc_cfg.widget_id}, 
.fc-dialog-overlay-${fc_cfg.widget_id} img.fc-away-${fc_cfg.widget_id}, 
.fc-chat-dock-${fc_cfg.widget_id} img.fc-away-${fc_cfg.widget_id} {
  border: 2px solid #f1c40f;
  box-sizing: border-box;
  box-shadow: 0 0 4px rgba(241, 196, 15, 0.6);
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

/* Busy */
.fc-messenger-window-${fc_cfg.widget_id} img.fc-busy-${fc_cfg.widget_id}, 
.fc-dialog-overlay-${fc_cfg.widget_id} img.fc-busy-${fc_cfg.widget_id},
.fc-chat-dock-${fc_cfg.widget_id} img.fc-busy-${fc_cfg.widget_id} {
  border: 2px solid #e74c3c;
  box-sizing: border-box;
  box-shadow: 0 0 4px rgba(231, 76, 60, 0.6);
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

/* Offline */
.fc-messenger-window-${fc_cfg.widget_id} img.fc-offline-${fc_cfg.widget_id}, 
.fc-dialog-overlay-${fc_cfg.widget_id} img.fc-offline-${fc_cfg.widget_id},
.fc-chat-dock-${fc_cfg.widget_id} img.fc-offline-${fc_cfg.widget_id} {
  border: 2px solid #95a5a6;
  box-sizing: border-box;
  box-shadow: 0 0 4px rgba(149, 165, 166, 0.6);
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}


.fc-messenger-window-${fc_cfg.widget_id} .fc-statusColor-${fc_cfg.widget_id}.fc-online-${fc_cfg.widget_id},
.fc-dialog-overlay-${fc_cfg.widget_id} .fc-statusColor-${fc_cfg.widget_id}.fc-online-${fc_cfg.widget_id},
.fc-chat-dock-${fc_cfg.widget_id} .fc-statusColor-${fc_cfg.widget_id}.fc-online-${fc_cfg.widget_id} {
  color: #2ecc71!important;
}
.fc-messenger-window-${fc_cfg.widget_id} .fc-statusColor-${fc_cfg.widget_id}.fc-away-${fc_cfg.widget_id}, 
.fc-dialog-overlay-${fc_cfg.widget_id} .fc-statusColor-${fc_cfg.widget_id}.fc-away-${fc_cfg.widget_id},
.fc-chat-dock-${fc_cfg.widget_id} .fc-statusColor-${fc_cfg.widget_id}.fc-away-${fc_cfg.widget_id} {
  color: #f1c40f!important;
}
.fc-messenger-window-${fc_cfg.widget_id} .fc-statusColor-${fc_cfg.widget_id}.fc-busy-${fc_cfg.widget_id}, 
.fc-dialog-overlay-${fc_cfg.widget_id} .fc-statusColor-${fc_cfg.widget_id}.fc-busy-${fc_cfg.widget_id},
.fc-chat-dock-${fc_cfg.widget_id} .fc-statusColor-${fc_cfg.widget_id}.fc-busy-${fc_cfg.widget_id} {
  color: #e74c3c!important;
}
.fc-messenger-window-${fc_cfg.widget_id} .fc-statusColor-${fc_cfg.widget_id}.fc-offline-${fc_cfg.widget_id}, 
.fc-dialog-overlay-${fc_cfg.widget_id}  .fc-statusColor-${fc_cfg.widget_id}.fc-offline-${fc_cfg.widget_id},
.fc-chat-dock-${fc_cfg.widget_id} .fc-statusColor-${fc_cfg.widget_id}.fc-offline-${fc_cfg.widget_id} {
  color: #95a5a6!important;
}

/* Base status dot */
.fc-messenger-window-${fc_cfg.widget_id} .fc-statusDot-${fc_cfg.widget_id},
.fc-dialog-overlay-${fc_cfg.widget_id} .fc-statusDot-${fc_cfg.widget_id},
.fc-chat-dock-${fc_cfg.widget_id} .fc-statusDot-${fc_cfg.widget_id} {
  position: absolute;
  top: 5px;
  left: 5px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 1px solid ${fc_cfg.accent_color}; /* fallback */
  border: 1px solid color-mix(in srgb, ${fc_cfg.accent_color} 40%, black); /* modern */
  box-shadow: 0 0 2px rgba(0,0,0,0.3); /* subtle glow for visibility */
}

/* Online */
.fc-messenger-window-${fc_cfg.widget_id} .fc-statusDot-${fc_cfg.widget_id}.fc-online-${fc_cfg.widget_id},
.fc-dialog-overlay-${fc_cfg.widget_id}  .fc-statusDot-${fc_cfg.widget_id}.fc-online-${fc_cfg.widget_id},
.fc-chat-dock-${fc_cfg.widget_id} .fc-statusDot-${fc_cfg.widget_id}.fc-online-${fc_cfg.widget_id} {
  background-color: #28a745; /* green */
}

/* Offline */
.fc-messenger-window-${fc_cfg.widget_id} .fc-statusDot-${fc_cfg.widget_id}.fc-offline-${fc_cfg.widget_id},
.fc-dialog-overlay-${fc_cfg.widget_id}  .fc-statusDot-${fc_cfg.widget_id}.fc-offline-${fc_cfg.widget_id},
.fc-chat-dock-${fc_cfg.widget_id} .fc-statusDot-${fc_cfg.widget_id}.fc-offline-${fc_cfg.widget_id} {
  background-color: #6c757d; /* gray */
}

/* Busy */
.fc-messenger-window-${fc_cfg.widget_id} .fc-statusDot-${fc_cfg.widget_id}.fc-busy-${fc_cfg.widget_id},
.fc-dialog-overlay-${fc_cfg.widget_id}  .fc-statusDot-${fc_cfg.widget_id}.fc-busy-${fc_cfg.widget_id},
.fc-chat-dock-${fc_cfg.widget_id} .fc-statusDot-${fc_cfg.widget_id}.fc-busy-${fc_cfg.widget_id} {
  background-color: #dc3545; /* red */
}

/* Away */
.fc-messenger-window-${fc_cfg.widget_id} .fc-statusDot-${fc_cfg.widget_id}.fc-away-${fc_cfg.widget_id},
.fc-dialog-overlay-${fc_cfg.widget_id}  .fc-statusDot-${fc_cfg.widget_id}.fc-away-${fc_cfg.widget_id},
.fc-chat-dock-${fc_cfg.widget_id} .fc-statusDot-${fc_cfg.widget_id}.fc-away-${fc_cfg.widget_id} {
  background-color: #ffc107; /* yellow */
}

/* Messenger User Header */
.fc-messenger-window-${fc_cfg.widget_id} .fc-self-info-${fc_cfg.widget_id} {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px;
  background: color-mix(in srgb, ${fc_cfg.accent_color} 40%, white);
  border-bottom: 1px solid color-mix(in srgb, ${fc_cfg.accent_color} 40%, black);
  box-shadow: 0 1px 3px color-mix(in srgb, ${fc_cfg.accent_color} 40%, black);
  position: relative;
}

/* Avatar */
.fc-messenger-window-${fc_cfg.widget_id} .fc-self-info-${fc_cfg.widget_id} .fc-dp-${fc_cfg.widget_id} {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
  margin-right: 6px;
}

/* Edit icon overlay */
.fc-messenger-window-${fc_cfg.widget_id} .fc-self-info-${fc_cfg.widget_id} .fc-edit-icon-${fc_cfg.widget_id} {
  position: absolute;
  top: 2px;
  left: 45px;
  width: 20px;
  height: 20px;
  background: ${fc_cfg.accent_color};
  color: ${fc_cfg.accent_text_color};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}
.fc-messenger-window-${fc_cfg.widget_id} .fc-self-info-${fc_cfg.widget_id} .fc-edit-icon-${fc_cfg.widget_id}:hover {
  background: ${fc_cfg.accent_text_color};
  color: ${fc_cfg.accent_color};
}

.fc-messenger-window-${fc_cfg.widget_id} .fc-self-info-${fc_cfg.widget_id} p {
  padding: 0;
  margin: 0;
}

/* Title block */
.fc-messenger-window-${fc_cfg.widget_id} .fc-self-info-${fc_cfg.widget_id} .fc-title-${fc_cfg.widget_id} {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.fc-messenger-window-${fc_cfg.widget_id} .fc-self-info-${fc_cfg.widget_id} .fc-nickname-${fc_cfg.widget_id} {
  font-size: 0.95rem;
  font-weight: 600;
  color: color-mix(in srgb, ${fc_cfg.accent_text_color} 40%, black);
  max-width: 20ch;       /* limit to ~22 characters */
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  margin: 1px;
  padding: 1px;
}

.fc-messenger-window-${fc_cfg.widget_id} .fc-self-info-${fc_cfg.widget_id} .fc-status-${fc_cfg.widget_id} {
  font-size: 0.75rem;
  color: color-mix(in srgb, ${fc_cfg.accent_text_color} 40%, black);
  margin: 1px;
  padding: 1px;
}

/* Icons area */
.fc-messenger-window-${fc_cfg.widget_id} .fc-self-info-${fc_cfg.widget_id} .fc-icons-${fc_cfg.widget_id} {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
}

/* Notification bell */
.fc-messenger-window-${fc_cfg.widget_id} .fc-self-info-${fc_cfg.widget_id} .fc-icons-${fc_cfg.widget_id} .fc-lnk-${fc_cfg.widget_id} {
  color: color-mix(in srgb, ${fc_cfg.accent_text_color} 40%, black);
  cursor: pointer;
  transition: transform 0.2s ease, color 0.2s ease;
}

.fc-messenger-window-${fc_cfg.widget_id} .fc-self-info-${fc_cfg.widget_id} .fc-icons-${fc_cfg.widget_id} .fc-lnk-${fc_cfg.widget_id}:hover {
  color: ${fc_cfg.accent_color};
  transform: scale(1.2);
}

.fc-messenger-window-${fc_cfg.widget_id} .fc-self-info-${fc_cfg.widget_id} .fc-icons-${fc_cfg.widget_id} .fc-lnk-${fc_cfg.widget_id}.fc-unread-${fc_cfg.widget_id}{
  color: ${fc_cfg.accent_color};
}

/* Notification menu */
.fc-messenger-window-${fc_cfg.widget_id} .fc-notifications-menu-${fc_cfg.widget_id} {
  display: block;              /* keep block for transition */
  visibility: hidden;
  opacity: 0;
  position: absolute;
  right: 0;
  margin-top: 3px;
  background: ${fc_cfg.screen_bg_color};
  border: 1px solid color-mix(in srgb, ${fc_cfg.accent_color} 40%, black);
  border-radius: 4px;
  box-shadow: 0 4px 12px color-mix(in srgb, ${fc_cfg.accent_color} 40%, black);
  max-height: 50%;
  max-width: 95%;
  min-width: 260px;
  min-height: 220px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scroll-behavior: smooth;
  transform: translateZ(0);
  overflow-x: hidden;
  padding: 0;
  z-index: 10000;
  transition: opacity 0.3s ease, visibility 0s linear 0.3s; /* delay hide */
}

/* Show menu on hover */

.fc-messenger-window-${fc_cfg.widget_id} .fc-self-info-${fc_cfg.widget_id} .fc-notifications-${fc_cfg.widget_id} {
 position: relative;
}

.fc-messenger-window-${fc_cfg.widget_id} .fc-self-info-${fc_cfg.widget_id} .fc-notifications-${fc_cfg.widget_id}:hover .fc-notifications-menu-${fc_cfg.widget_id} {
  visibility: visible;
  opacity: 1;
  transition-delay: 0s; /* show immediately */
}

.fc-messenger-window-${fc_cfg.widget_id} .fc-self-info-${fc_cfg.widget_id} .fc-notifications-${fc_cfg.widget_id} .fc-badge-${fc_cfg.widget_id} {
  position: absolute;
  top: 2px;
  right: -3px;
}

/* Notification items */
.fc-messenger-window-${fc_cfg.widget_id} .fc-notifications-menu-${fc_cfg.widget_id} li {
  padding: 8px 12px;
  font-size: 0.85rem;
  color: ${fc_cfg.screen_text_color};
  transition: background-color 0.2s ease;
  border-bottom: 1px dashed ${fc_cfg.accent_color};
}

.fc-messenger-window-${fc_cfg.widget_id} .fc-notifications-menu-${fc_cfg.widget_id} li.fc-unread-${fc_cfg.widget_id} {
  background-color: color-mix(in srgb, ${fc_cfg.accent_color} 40%, white);
  color: color-mix(in srgb, ${fc_cfg.accent_text_color} 40%, black);
}

.fc-messenger-window-${fc_cfg.widget_id} .fc-notifications-menu-${fc_cfg.widget_id} li:hover {
  background-color: ${fc_cfg.accent_color};
  color: ${fc_cfg.accent_text_color};
}

.fc-messenger-window-${fc_cfg.widget_id} .fc-notifications-menu-${fc_cfg.widget_id} li a {
  color: inherit;
  text-decoration: none;
  font-weight: bold;
}

.fc-messenger-window-${fc_cfg.widget_id} .fc-notifications-menu-${fc_cfg.widget_id} li a:hover {
  text-decoration: underline;
}

.fc-messenger-window-${fc_cfg.widget_id} .fc-tabs-${fc_cfg.widget_id} {
  display: flex;
  border-bottom: 1px solid ${fc_cfg.button_color}
}

.fc-messenger-window-${fc_cfg.widget_id} .fc-tab-${fc_cfg.widget_id} {
  flex: 1;
  text-align: center;
  padding: 10px;
  cursor: pointer;
  color: ${fc_cfg.screen_text_color};
  transition: all 0.3s ease;
  position: relative;
}

.fc-messenger-window-${fc_cfg.widget_id} .fc-tab-${fc_cfg.widget_id} .fc-badge-${fc_cfg.widget_id} {
  position: absolute;
  top: 6px;
  right: 16px;
}

.fc-messenger-window-${fc_cfg.widget_id} .fc-tab-${fc_cfg.widget_id}:focus-visible {
  outline: 2px solid ${fc_cfg.accent_color};
}

.fc-messenger-window-${fc_cfg.widget_id} .fc-tab-${fc_cfg.widget_id}:hover {
  color: ${fc_cfg.accent_color};
}

.fc-messenger-window-${fc_cfg.widget_id} .fc-tab-${fc_cfg.widget_id}.fc-active-${fc_cfg.widget_id} {
  color: ${fc_cfg.accent_color};
  font-weight: bold;
  border-bottom: 1px solid ${fc_cfg.accent_color};
}

.fc-messenger-window-${fc_cfg.widget_id} .fc-tabsContents-${fc_cfg.widget_id} {
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  scroll-behavior: smooth;
  transform: translateZ(0);
  padding: 0px;
  background: ${fc_cfg.screen_bg_color};
  color: ${fc_cfg.screen_text_color};
}

.fc-messenger-window-${fc_cfg.widget_id} .fc-tabContent-${fc_cfg.widget_id} {
  display: none;
  padding: 0px;
}

.fc-messenger-window-${fc_cfg.widget_id} .fc-tabContent-${fc_cfg.widget_id}.fc-active-${fc_cfg.widget_id} {
  display: block;
}

/* ===== Shared List Containers ===== */
.fc-messenger-window-${fc_cfg.widget_id} #fc-list-rooms-${fc_cfg.widget_id} ul,
.fc-messenger-window-${fc_cfg.widget_id} #fc-list-nearby-${fc_cfg.widget_id} ul,
.fc-messenger-window-${fc_cfg.widget_id} #fc-list-chats-${fc_cfg.widget_id} ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.fc-messenger-window-${fc_cfg.widget_id} .fc-tabContent-${fc_cfg.widget_id} .fc-searchWrap-${fc_cfg.widget_id} {
  border-top: 1px solid color-mix(in srgb, ${fc_cfg.accent_color} 40%, black);
  border-bottom: 1px solid color-mix(in srgb, ${fc_cfg.accent_color} 40%, black);
  font-weight: 200;
}

.fc-messenger-window-${fc_cfg.widget_id} .fc-tabContent-${fc_cfg.widget_id} .fc-searchWrap-${fc_cfg.widget_id} label {
  position: absolute;
  margin: 7px 0 0 14px;
  color: ${fc_cfg.accent_color};
}

.fc-messenger-window-${fc_cfg.widget_id} .fc-tabContent-${fc_cfg.widget_id} .fc-searchWrap-${fc_cfg.widget_id} .fc-search-${fc_cfg.widget_id} {
  font-size: 0.9rem;
  padding: 10px 0 10px 46px;
  width: 100%;
  border: none;
  background: color-mix(in srgb, ${fc_cfg.accent_color} 40%, white);
  color: ${fc_cfg.accent_color};
}

/* ===== Shared Item Styling (Rooms + Nearby + Chats) ===== */
.fc-messenger-window-${fc_cfg.widget_id} .fc-room-${fc_cfg.widget_id},
.fc-messenger-window-${fc_cfg.widget_id} .fc-nearby-${fc_cfg.widget_id},
.fc-messenger-window-${fc_cfg.widget_id} .fc-chat-${fc_cfg.widget_id} {
  display: flex;
  align-items: center;
  padding: 5px 6px;
  border-bottom: 1px solid ${fc_cfg.button_color};
  cursor: pointer;
  color: ${fc_cfg.recipient_text_color};
  background-color: ${fc_cfg.recipient_bg_color};
  transition: background-color 0.2s ease, color 0.2s ease;
}

.fc-messenger-window-${fc_cfg.widget_id} .fc-room-${fc_cfg.widget_id}:hover,
.fc-messenger-window-${fc_cfg.widget_id} .fc-nearby-${fc_cfg.widget_id}:hover,
.fc-messenger-window-${fc_cfg.widget_id} .fc-chat-${fc_cfg.widget_id}:hover {
  color: ${fc_cfg.sender_text_color};
  background-color: ${fc_cfg.sender_bg_color};
  cursor: default;
}

.fc-messenger-window-${fc_cfg.widget_id} .fc-chat-${fc_cfg.widget_id}.fc-unread-${fc_cfg.widget_id} {
  font-weight: 600;
}


/* Inner wrap */
.fc-messenger-window-${fc_cfg.widget_id} .fc-room-${fc_cfg.widget_id} .fc-wrap-${fc_cfg.widget_id},
.fc-messenger-window-${fc_cfg.widget_id} .fc-nearby-${fc_cfg.widget_id} .fc-wrap-${fc_cfg.widget_id},
.fc-messenger-window-${fc_cfg.widget_id} .fc-chat-${fc_cfg.widget_id} .fc-wrap-${fc_cfg.widget_id} {
  display: flex;
  align-items: center;
  width: 100%;
  position: relative; /* allows status dot overlay */
}

.fc-messenger-window-${fc_cfg.widget_id} .fc-room-${fc_cfg.widget_id} .fc-wrap-${fc_cfg.widget_id}.fc-link-${fc_cfg.widget_id},
.fc-messenger-window-${fc_cfg.widget_id} .fc-nearby-${fc_cfg.widget_id} .fc-wrap-${fc_cfg.widget_id}.fc-link-${fc_cfg.widget_id},
.fc-messenger-window-${fc_cfg.widget_id} .fc-chat-${fc_cfg.widget_id} .fc-wrap-${fc_cfg.widget_id}.fc-link-${fc_cfg.widget_id} {
  cursor: pointer;
}

/* ===== Avatar Images ===== */
.fc-messenger-window-${fc_cfg.widget_id} .fc-room-${fc_cfg.widget_id} img,
.fc-messenger-window-${fc_cfg.widget_id} .fc-nearby-${fc_cfg.widget_id} img,
.fc-messenger-window-${fc_cfg.widget_id} .fc-chat-${fc_cfg.widget_id} img {
  width: 40px;
  height: 40px;
  border-radius: 6px; /* rooms: rounded square */
  object-fit: cover;
  margin-right: 10px;
}

/* Nearby avatars are circular */
.fc-messenger-window-${fc_cfg.widget_id} .fc-nearby-${fc_cfg.widget_id} img,
.fc-messenger-window-${fc_cfg.widget_id} .fc-chat-${fc_cfg.widget_id} img {
  border-radius: 50%;
}

/* ===== Status Dot Overlay (Chat + Nearby) ===== */
.fc-messenger-window-${fc_cfg.widget_id} .fc-nearby-${fc_cfg.widget_id} .fc-status-${fc_cfg.widget_id},
.fc-messenger-window-${fc_cfg.widget_id} .fc-chat-${fc_cfg.widget_id} .fc-status-${fc_cfg.widget_id} {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid ${fc_cfg.recipient_bg_color}; /* separates dot from avatar */
}

/* ===== Meta Info ===== */
.fc-messenger-window-${fc_cfg.widget_id} .fc-room-${fc_cfg.widget_id} .fc-meta-${fc_cfg.widget_id},
.fc-messenger-window-${fc_cfg.widget_id} .fc-nearby-${fc_cfg.widget_id} .fc-meta-${fc_cfg.widget_id},
.fc-messenger-window-${fc_cfg.widget_id} .fc-chat-${fc_cfg.widget_id} .fc-meta-${fc_cfg.widget_id} {
  flex: 1;
}

.fc-messenger-window-${fc_cfg.widget_id} .fc-room-${fc_cfg.widget_id} .fc-meta-${fc_cfg.widget_id} .fc-name-${fc_cfg.widget_id},
.fc-messenger-window-${fc_cfg.widget_id} .fc-nearby-${fc_cfg.widget_id} .fc-meta-${fc_cfg.widget_id} .fc-name-${fc_cfg.widget_id},
.fc-messenger-window-${fc_cfg.widget_id} .fc-chat-${fc_cfg.widget_id} .fc-meta-${fc_cfg.widget_id} .fc-name-${fc_cfg.widget_id} {
  font-size: 14px;
  margin: 0;
  display: block;
  max-width: 22ch;       /* limit to ~22 characters */
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.fc-messenger-window-${fc_cfg.widget_id} .fc-room-${fc_cfg.widget_id} .fc-meta-${fc_cfg.widget_id} .fc-preview-${fc_cfg.widget_id},
.fc-messenger-window-${fc_cfg.widget_id} .fc-nearby-${fc_cfg.widget_id} .fc-meta-${fc_cfg.widget_id} .fc-preview-${fc_cfg.widget_id},
.fc-messenger-window-${fc_cfg.widget_id} .fc-chat-${fc_cfg.widget_id} .fc-meta-${fc_cfg.widget_id} .fc-preview-${fc_cfg.widget_id} {
  font-size: 10px;
  margin: 2px 0 0;
  opacity: 0.8;
  max-width: 24ch; /* limit to ~24 characters */
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* ===== Action Area (icons) ===== */
.fc-messenger-window-${fc_cfg.widget_id} .fc-room-${fc_cfg.widget_id} .fc-action-${fc_cfg.widget_id},
.fc-messenger-window-${fc_cfg.widget_id} .fc-nearby-${fc_cfg.widget_id} .fc-action-${fc_cfg.widget_id} 
.fc-messenger-window-${fc_cfg.widget_id} .fc-chat-${fc_cfg.widget_id} .fc-action-${fc_cfg.widget_id} {
  margin-left: auto;
  display: flex;
  align-items: center;
}

.fc-messenger-window-${fc_cfg.widget_id} .fc-room-${fc_cfg.widget_id} .fc-action-${fc_cfg.widget_id} a,
.fc-messenger-window-${fc_cfg.widget_id} .fc-room-${fc_cfg.widget_id} .fc-action-${fc_cfg.widget_id} svg,
.fc-messenger-window-${fc_cfg.widget_id} .fc-nearby-${fc_cfg.widget_id} .fc-action-${fc_cfg.widget_id} a,
.fc-nearby-${fc_cfg.widget_id} .fc-action-${fc_cfg.widget_id} svg,
.fc-messenger-window-${fc_cfg.widget_id} .fc-chat-${fc_cfg.widget_id} .fc-action-${fc_cfg.widget_id} a,
.fc-messenger-window-${fc_cfg.widget_id} .fc-chat-${fc_cfg.widget_id} .fc-action-${fc_cfg.widget_id} svg {
  color: ${fc_cfg.recipient_text_color};
  text-decoration: none;
  transition: transform 0.2s ease, color 0.2s ease;
}

.fc-messenger-window-${fc_cfg.widget_id} .fc-room-${fc_cfg.widget_id} .fc-action-${fc_cfg.widget_id} a:hover svg,
.fc-messenger-window-${fc_cfg.widget_id} .fc-nearby-${fc_cfg.widget_id} .fc-action-${fc_cfg.widget_id} a:hover svg,
.fc-messenger-window-${fc_cfg.widget_id} .fc-chat-${fc_cfg.widget_id} .fc-action-${fc_cfg.widget_id} a:hover svg {
  transform: scale(1.1);
  color: ${fc_cfg.sender_text_color};
}

.fc-messenger-window-${fc_cfg.widget_id} .fc-badge-${fc_cfg.widget_id} {
  color: color-mix(in srgb, ${fc_cfg.accent_text_color} 40%, white);
  background-color: color-mix(in srgb, ${fc_cfg.accent_color} 40%, black);
  font-size: 0.55rem;
  min-width: 15px;
  height: 15px;
  line-height: 15px;
  border-radius: 50%;
  text-align: center;
  padding: 0 3px;
  display: inline-block;
  margin-left: auto; /* push to right */
}


/* Dock container fixed at bottom */
#fc-chat-dock-${fc_cfg.widget_id} {
  position: fixed;
  bottom: 0;
  left: 24px;
  right: 350px; /* leave space for "More" button */
  height: auto;
  z-index: 9999;
  display: flex;
  align-items: flex-end;
  gap: 6px;
  padding: 0;
  pointer-events: none; /* allow windows to manage interactions */
}


/* Each chat window */
.fc-chat-dock-${fc_cfg.widget_id} .fc-chat-win-${fc_cfg.widget_id} {
  pointer-events: auto;
  width: 280px;
  max-height: 50vh;
  min-height: 325px;
  background: ${fc_cfg.screen_bg_color};
  border: 1px solid color-mix(in srgb, ${fc_cfg.screen_bg_color} 80%, black);
  border-radius: 10px 10px 0 0;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
}

/* Header container with enhanced gradient */
.fc-chat-dock-${fc_cfg.widget_id} .fc-chat-info-${fc_cfg.widget_id} {
  display: flex;
  align-items: center;                 /* vertical center avatar + title + icons */
  justify-content: space-between;
  gap: 5px;
  padding: 8px 12px;
  color: ${fc_cfg.screen_text_color};
  user-select: none;

  /* Smooth vertical gradient with subtle lighting effect */
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.5) 0%,                  /* dark top */
    ${fc_cfg.screen_bg_color} 50%,          /* center color */
    rgba(255, 255, 255, 0.5) 100%          /* light bottom */
  );

  border-bottom: 1px solid rgba(0, 0, 0, 0.3);
  border-radius: 10px 10px 0 0;

  /* Subtle text shadow for better readability */
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);

  /* Smooth hover effect (optional) */
  transition: background 0.3s ease, color 0.3s ease;
}

/* Header hover effect (optional, adds modern feel) */
.fc-chat-dock-${fc_cfg.widget_id} .fc-chat-info-${fc_cfg.widget_id}:hover {
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.9) 0%,
    ${fc_cfg.screen_bg_color} 50%,
    rgba(255, 255, 255, 0.9) 100%
  );
  color: ${fc_cfg.screen_text_color};
}



/* Avatar */
.fc-dialog-overlay-${fc_cfg.widget_id} .fc-dp-${fc_cfg.widget_id}, 
.fc-chat-dock-${fc_cfg.widget_id} .fc-chat-info-${fc_cfg.widget_id} .fc-dp-${fc_cfg.widget_id} {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
}

/* Title block (nickname + status) */
.fc-chat-dock-${fc_cfg.widget_id} .fc-chat-title-${fc_cfg.widget_id} {
  display: flex;
  flex-direction: column;
  justify-content: center;            /* vertical center text inside */
  align-items: flex-start;            /* left align */
  line-height: 1.2;
  flex: 1;                            /* take available width between avatar & icons */
  min-width: 0;                       /* allow flexbox to shrink text properly */
  height: 32px;                       /* controlled height */
  max-height: 32px;
}

.fc-chat-dock-${fc_cfg.widget_id} .fc-chat-title-${fc_cfg.widget_id} p {
  margin: 0;
  padding: 0;
}

/* Nickname */
.fc-chat-dock-${fc_cfg.widget_id} .fc-chat-title-${fc_cfg.widget_id} .fc-nickname-${fc_cfg.widget_id} {
  font-weight: 600;
  font-size: 12px;
  margin: 0;
  max-width: 18ch;       /* limit to ~22 characters */
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  padding-bottom: 1px;
}

/* Status */
.fc-chat-dock-${fc_cfg.widget_id} .fc-chat-title-${fc_cfg.widget_id} .fc-status-${fc_cfg.widget_id} {
  font-size: 10px;
  color: color-mix(in srgb, ${fc_cfg.screen_text_color} 40%, black);
   max-width: 22ch;       /* limit to ~22 characters */
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  padding-top: 1px;
}

/* Header controls (buttons) */
.fc-chat-dock-${fc_cfg.widget_id} .fc-chat-icons-${fc_cfg.widget_id} {
  display: flex;
  align-items: center;
  gap: 1px;
}

.fc-chat-dock-${fc_cfg.widget_id} .fc-icon-btn-${fc_cfg.widget_id} {
  border: none;
  background: transparent;
  cursor: pointer;
  color: ${fc_cfg.button_color};
  padding: 2px;
  border-radius: 6px;
  transition: background .2s, color .2s;
}

.fc-chat-dock-${fc_cfg.widget_id} .fc-icon-btn-${fc_cfg.widget_id}:hover {
  background: ${fc_cfg.button_color};
  color: ${fc_cfg.button_text_color};
}


/* Messages */
.fc-chat-dock-${fc_cfg.widget_id} .fc-messages-${fc_cfg.widget_id} {
  overflow-y: scroll;
  overflow-x: hidden;
  overscroll-behavior: contain;
  scroll-behavior: smooth;
  transform: translateZ(0);
  padding: 0px;
  min-height: 243px;
}

.fc-chat-dock-${fc_cfg.widget_id} .fc-messages-${fc_cfg.widget_id}::-webkit-scrollbar {
  width: 8px;
  background: transparent;
}
.fc-chat-dock-${fc_cfg.widget_id} .fc-messages-${fc_cfg.widget_id}::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.3);
}
.fc-chat-dock-${fc_cfg.widget_id} .fc-messages-${fc_cfg.widget_id} ul {
margin: 0px;
padding:1px 0px 10px 2px;

}
.fc-chat-dock-${fc_cfg.widget_id} .fc-messages-${fc_cfg.widget_id} ul li {
  display: inline-block;
  clear: both;
  margin: 5px;
  width: calc(100% - 20px);
  font-size: 0.7em;
}
.fc-chat-dock-${fc_cfg.widget_id} .fc-messages-${fc_cfg.widget_id} ul li:nth-last-child(1) {
  margin-bottom: 10px;
}

.fc-system-${fc_cfg.widget_id} {
  text-align: center;
  list-style: none;
}

.fc-system-text-${fc_cfg.widget_id} {
  display: inline-block;
  background: ${fc_cfg.screen_text_color};
  color: ${fc_cfg.screen_bg_color};
  font-style: italic;
}

.fc-chat-dock-${fc_cfg.widget_id} .fc-messages-${fc_cfg.widget_id} ul li.fc-replies-${fc_cfg.widget_id} img.fc-dp-${fc_cfg.widget_id} {
  float: left;
  margin: 3px 7px 0px 0px;
}
.fc-chat-dock-${fc_cfg.widget_id} .fc-messages-${fc_cfg.widget_id} ul li.fc-replies-${fc_cfg.widget_id} span.fc-nickname-${fc_cfg.widget_id} {
  text-align: left !important;
  font-size: 0.6rem;
  font-weight: 600;
  padding: 4px 5px 5px 30px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fc-chat-dock-${fc_cfg.widget_id} .fc-messages-${fc_cfg.widget_id} ul li.fc-replies-${fc_cfg.widget_id} p {
  background: ${fc_cfg.recipient_bg_color};
  color: ${fc_cfg.recipient_text_color};
  float: left;
}
.fc-chat-dock-${fc_cfg.widget_id} .fc-messages-${fc_cfg.widget_id} ul li.fc-replies-${fc_cfg.widget_id} span.fc-status-${fc_cfg.widget_id} {
  text-align: left !important;
  font-size: 0.5rem;
  color: ${fc_cfg.recipient_bg_color};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fc-chat-dock-${fc_cfg.widget_id} .fc-messages-${fc_cfg.widget_id} ul li.fc-sent-${fc_cfg.widget_id} img.fc-dp-${fc_cfg.widget_id} {
  float: right;
  margin: 3px 0 0px 7px;
}
.fc-chat-dock-${fc_cfg.widget_id} .fc-messages-${fc_cfg.widget_id} ul li.fc-sent-${fc_cfg.widget_id} span.fc-nickname-${fc_cfg.widget_id} {
  text-align: right !important;
  font-size: 0.6rem;
  font-weight: 600;
  padding: 4px 30px 5px 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fc-chat-dock-${fc_cfg.widget_id} .fc-messages-${fc_cfg.widget_id} ul li.fc-sent-${fc_cfg.widget_id} p {
  background: ${fc_cfg.sender_bg_color};
  color: ${fc_cfg.sender_text_color};
  float: right;
}
.fc-chat-dock-${fc_cfg.widget_id} .fc-messages-${fc_cfg.widget_id} ul li.fc-sent-${fc_cfg.widget_id} span.fc-status-${fc_cfg.widget_id} {
  display: flex;
  flex-direction: row;
  align-items: right;
  justify-content: right;
  font-size: 0.5rem;
  color: ${fc_cfg.sender_bg_color};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fc-chat-dock-${fc_cfg.widget_id} .fc-messages-${fc_cfg.widget_id} ul li img.fc-dp-${fc_cfg.widget_id} {
  width: 22px;
  border-radius: 50%;
}
.fc-chat-dock-${fc_cfg.widget_id} .fc-messages-${fc_cfg.widget_id} ul li span.fc-nickname-${fc_cfg.widget_id} {
  display: block;
  padding: 5px 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 1px 2px ${fc_cfg.screen_text_color};
  -webkit-text-stroke: 0.5px ${fc_cfg.screen_text_color};
}
.fc-chat-dock-${fc_cfg.widget_id} .fc-messages-${fc_cfg.widget_id} ul li p {
  padding: 5px 5px;
  border-radius: 10px;
  max-width: 77%;
  line-height: 130%;
  margin-bottom: 0.1rem;
}
.fc-chat-dock-${fc_cfg.widget_id} .fc-messages-${fc_cfg.widget_id} ul li p img{
  max-width: 180px;
  max-height: 180px;
  border-radius: 10px;
}
.fc-chat-dock-${fc_cfg.widget_id} .fc-messages-${fc_cfg.widget_id} ul li span.fc-status-${fc_cfg.widget_id} {
  display: inline;
  padding: 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fc-chat-dock-${fc_cfg.widget_id} .fc-messages-${fc_cfg.widget_id} ul li span.fc-status-${fc_cfg.widget_id}.fc-seen-${fc_cfg.widget_id} {
  color: ${fc_cfg.sender_bg_color};
  -webkit-text-stroke: 1px ${fc_cfg.sender_text_color};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}


/* Input area */
.fc-chat-dock-${fc_cfg.widget_id} .fc-inputs-${fc_cfg.widget_id} {
  border-top: 1px solid color-mix(in srgb, ${fc_cfg.screen_bg_color} 80%, black);
  padding: 1px;
  background: ${fc_cfg.button_color};
}

.fc-chat-dock-${fc_cfg.widget_id} .fc-inputs-${fc_cfg.widget_id} .fc-wrap-${fc_cfg.widget_id} {
  display: flex;
  align-items: center;
}


.fc-chat-dock-${fc_cfg.widget_id} .fc-inputs-${fc_cfg.widget_id} .fc-wrap-${fc_cfg.widget_id} .fc-file-form-${fc_cfg.widget_id} {
  visibility: hidden;
  position: absolute;
}

.fc-chat-dock-${fc_cfg.widget_id} .fc-inputs-${fc_cfg.widget_id} input[type="text"] {
  flex: 1;
  padding: 7px;
  font-size: 12px;
  background: ${fc_cfg.button_color};
  border: 0;
  color: ${fc_cfg.button_text_color};  
  transition: border-color .2s, box-shadow .2s, color .2s;
}

/* Placeholder (hint text) */
.fc-chat-dock-${fc_cfg.widget_id} .fc-inputs-${fc_cfg.widget_id} input[type="text"]::placeholder {
  color: color-mix(in srgb, ${fc_cfg.button_text_color} 60%, black); /* softer hint color */
  opacity: 1; /* ensure consistent rendering across browsers */
}

/* When focused (typing) */
.fc-chat-dock-${fc_cfg.widget_id} .fc-inputs-${fc_cfg.widget_id} input[type="text"]:focus {
  outline: none; 
  background: ${fc_cfg.button_text_color};
  border: 1px solid color-mix(in srgb, ${fc_cfg.button_color} 80%, black);
  border-color: ${fc_cfg.button_color}; 
  box-shadow: 0 0 4px ${fc_cfg.button_color}; 
  color: ${fc_cfg.button_color}; 
}

/* Placeholder when focused */
.fc-chat-dock-${fc_cfg.widget_id} .fc-inputs-${fc_cfg.widget_id} input[type="text"]:focus::placeholder {
  color: color-mix(in srgb, ${fc_cfg.button_color} 60%, white); /* adjust hint color on focus */
}

/* Attachment/submit buttons */
.fc-chat-dock-${fc_cfg.widget_id} .fc-inputs-${fc_cfg.widget_id} .fc-attachment-${fc_cfg.widget_id},
.fc-chat-dock-${fc_cfg.widget_id} .fc-inputs-${fc_cfg.widget_id} .fc-submit-${fc_cfg.widget_id} {
  border: none;
  background: ${fc_cfg.button_color};
  padding: 5px;
  cursor: pointer;
  color: ${fc_cfg.button_text_color};
  transition: background .2s, color .2s, box-shadow .2s;
}

/* Hover and focus states */
.fc-chat-dock-${fc_cfg.widget_id} .fc-inputs-${fc_cfg.widget_id} .fc-attachment-${fc_cfg.widget_id}:hover,
.fc-chat-dock-${fc_cfg.widget_id} .fc-inputs-${fc_cfg.widget_id} .fc-attachment-${fc_cfg.widget_id}:focus,
.fc-chat-dock-${fc_cfg.widget_id} .fc-inputs-${fc_cfg.widget_id} .fc-submit-${fc_cfg.widget_id}:hover,
.fc-chat-dock-${fc_cfg.widget_id} .fc-inputs-${fc_cfg.widget_id} .fc-submit-${fc_cfg.widget_id}:focus {
  background: ${fc_cfg.button_text_color};   /* invert background */
  color: ${fc_cfg.button_color};             /* invert text color */
  outline: none;                             /* remove default outline */
  box-shadow: 0 0 4px ${fc_cfg.button_color};/* subtle glow for focus */
}


/* Minimized state */
.fc-chat-dock-${fc_cfg.widget_id} .fc-chat-win-${fc_cfg.widget_id}.fc-minimized-${fc_cfg.widget_id} .fc-messages-${fc_cfg.widget_id},
.fc-chat-dock-${fc_cfg.widget_id} .fc-chat-win-${fc_cfg.widget_id}.fc-minimized-${fc_cfg.widget_id} .fc-inputs-${fc_cfg.widget_id} {
  display: none;
}

.fc-chat-dock-${fc_cfg.widget_id} .fc-chat-win-${fc_cfg.widget_id}.fc-minimized-${fc_cfg.widget_id} {
  width: 220px;
  min-height: 0!important;
}

/* Blink on new message */
@keyframes fc-blink-${fc_cfg.widget_id} {
  0%   { background-color: ${fc_cfg.accent_color}; box-shadow: 0 0 4px ${fc_cfg.accent_color}; }
  50%  { background-color: ${fc_cfg.accent_text_color}; box-shadow: 0 0 12px ${fc_cfg.accent_text_color}; }
  100% { background-color: ${fc_cfg.accent_color}; box-shadow: 0 0 4px ${fc_cfg.accent_color}; }
}

.fc-chat-dock-${fc_cfg.widget_id} .fc-blink-${fc_cfg.widget_id} {
  animation: fc-blink-${fc_cfg.widget_id} 1s ease-in-out infinite;
}

/* Hidden windows indicator (for internal management) */
.fc-hidden-${fc_cfg.widget_id} {
  display: none !important;
}

.fc-lightbox-thumb-${fc_cfg.widget_id} {
  max-width: 160px;
  border-radius: 6px;
  cursor: zoom-in;
  transition: transform .15s ease;
}

.fc-lightbox-thumb-${fc_cfg.widget_id}:hover {
  transform: scale(1.04);
}

.fc-lightbox-overlay-${fc_cfg.widget_id} {
  position: fixed;
  inset: 0;
  top: 0; right: 0; bottom: 0; left: 0;
  background: rgba(0,0,0,.92);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999999;
  cursor: zoom-out;
}

.fc-lightbox-overlay-${fc_cfg.widget_id} img {
  max-width: 95%;
  max-height: 95%;
  object-fit: contain;
  border-radius: 6px;
}

/* Overlay */
.fc-dialog-overlay-${fc_cfg.widget_id} {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

/* Dialog box */
.fc-dialog-overlay-${fc_cfg.widget_id} .fc-dialog-box-${fc_cfg.widget_id} {
  background: #fff;
  border-radius: 6px;
  min-width: 300px;
  max-width: 600px;
  max-height: 80vh;              /* limit height */
  display: flex;
  flex-direction: column;        /* stack header + body */
  padding: 1rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  animation: fc-fadeIn-${fc_cfg.widget_id} 0.3s ease;
}

/* Header */
.fc-dialog-overlay-${fc_cfg.widget_id} .fc-dialog-header-${fc_cfg.widget_id} {
  font-weight: bold;
  font-size: 1rem;
  margin-bottom: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Body (scrollable) */
.fc-dialog-overlay-${fc_cfg.widget_id} .fc-dialog-body-${fc_cfg.widget_id} {
  font-size: 0.75rem;
  color: #333;
  overflow-y: auto;              /* scrollable */
  flex: 1;                       /* fill remaining space */
  padding-right: 0.5rem;         /* avoid scrollbar overlap */
}

/* Close button */
.fc-dialog-overlay-${fc_cfg.widget_id} .fc-dialog-close-${fc_cfg.widget_id} {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
}

/* Animation */
@keyframes fc-fadeIn-${fc_cfg.widget_id} {
  from { opacity: 0; transform: scale(0.95); }
  to   { opacity: 1; transform: scale(1); }
}

/* Profile container */
.fc-dialog-overlay-${fc_cfg.widget_id} .fc-profile-container-${fc_cfg.widget_id} {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  max-width: 700px;
  margin: 0 auto;
  padding: 0.5rem;
  box-sizing: border-box;
  background: linear-gradient(135deg, #fdfdfd, #f7f9fc);
  border-radius: 12px;
  box-shadow: 0 5px 15px rgba(0,0,0,0.12);
}

/* Left column (avatar + status) */
.fc-dialog-overlay-${fc_cfg.widget_id} .fc-profile-left-${fc_cfg.widget_id} {
  flex: 1 1 30%;
  text-align: center;
}

.fc-input-${fc_cfg.widget_id},
.fc-select-${fc_cfg.widget_id} {
  padding: 0.4rem 0.6rem;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 0.75rem;
  color: #222;
  background: #fff;
  transition: border-color 0.2s ease;
}

.fc-input-${fc_cfg.widget_id}:focus,
.fc-select-${fc_cfg.widget_id}:focus {
  border-color: #652fda;
  outline: none;
}

.fc-dialog-overlay-${fc_cfg.widget_id} .fc-avatar-wrap-${fc_cfg.widget_id} {
  position: relative;
  display: inline-block;
}

.fc-dialog-overlay-${fc_cfg.widget_id} .fc-avatar-wrap-${fc_cfg.widget_id} img {
  max-width: 100px;
  border-radius: 50%;
  transition: transform 0.3s ease;
  margin-bottom: 10px;
}

.fc-dialog-overlay-${fc_cfg.widget_id} .fc-avatar-wrap-${fc_cfg.widget_id} img:hover {
  transform: scale(1.05);
}

.fc-dialog-overlay-${fc_cfg.widget_id} .fc-statusText-${fc_cfg.widget_id} {
  margin-top: 0.75rem;
  font-weight: 600;
  font-size: 1rem;
}

/* Right column (details) */
.fc-dialog-overlay-${fc_cfg.widget_id} .fc-profile-right-${fc_cfg.widget_id} {
  flex: 1 1 65%;
}

.fc-dialog-overlay-${fc_cfg.widget_id} .fc-profile-row-${fc_cfg.widget_id} {
  display: flex;
  justify-content: space-between;
  margin: 0.2rem 0;
  padding: 0.2rem 0;
  border-bottom: 1px dashed #e0e0e0;
}

.fc-dialog-overlay-${fc_cfg.widget_id} .fc-profile-label-${fc_cfg.widget_id} {
  font-weight: 600;
  color: #555;
}

.fc-dialog-overlay-${fc_cfg.widget_id} .fc-profile-label-${fc_cfg.widget_id} .fc-name-${fc_cfg.widget_id} {
    max-width: 9ch;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.fc-dialog-overlay-${fc_cfg.widget_id} .fc-profile-value-${fc_cfg.widget_id} {
  color: #222;
  font-weight: 500;
}

.fc-dialog-overlay-${fc_cfg.widget_id} .fc-profile-value-${fc_cfg.widget_id}.fc-admin-${fc_cfg.widget_id} {
  color: #02a800;
}

.fc-dialog-overlay-${fc_cfg.widget_id} .fc-profile-value-${fc_cfg.widget_id}.fc-block-${fc_cfg.widget_id} {
  color: #ff0000;
}

/* Special section */
.fc-dialog-overlay-${fc_cfg.widget_id} .fc-profile-row-${fc_cfg.widget_id}.fc-looking-${fc_cfg.widget_id} {
  margin-top: 1.25rem;
  font-style: italic;
  font-weight: bold;
  color: #260079;
  border-bottom: none;
}

/* Action section */
.fc-dialog-overlay-${fc_cfg.widget_id} .fc-profile-action-${fc_cfg.widget_id} {
  flex: 1 1 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 1.5rem;
}

.fc-dialog-overlay-${fc_cfg.widget_id} .fc-accept-btn-${fc_cfg.widget_id} {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #652fdaff, #260079);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.fc-dialog-overlay-${fc_cfg.widget_id} .fc-accept-btn-${fc_cfg.widget_id}:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0,0,0,0.15);
}

.fc-dialog-overlay-${fc_cfg.widget_id} .fc-accept-btn-${fc_cfg.widget_id}:active {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0,0,0,0.15);
}


/* Responsive adjustments */
@media (max-width: 480px) {
  .fc-profile-container-${fc_cfg.widget_id} {
    flex-direction: column;
    padding: 1rem;
  }
  .fc-profile-left-${fc_cfg.widget_id}, .fc-profile-right-${fc_cfg.widget_id} {
    flex: 1 1 100%;
  }
}

.fc-messenger-window-${fc_cfg.widget_id} .fc-footer-${fc_cfg.widget_id} {
      font-size: 12px;
      padding: 8px;
      text-align: center;
      background: #9667C7;
      color: #260079;
    }
.fc-messenger-window-${fc_cfg.widget_id} .fc-footer-${fc_cfg.widget_id} a {
      color: inherit;
      text-decoration: none;
    }

@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}


  `;
  document.head.appendChild(fc_style);
}

class IndexedDBWrapper {
  constructor(dbName = "fishingcab", storeName = "data") {
    this.dbName = dbName;
    this.storeName = storeName;
    this.db = null;
    this.listeners = [];
  }

async init() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(this.dbName, 5); // bump version when schema changes

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains("data")) {
        db.createObjectStore("data", { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains("rooms")) {
        db.createObjectStore("rooms", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("users")) {
        db.createObjectStore("users", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("chats")) {
        db.createObjectStore("chats", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("messages")) {
        db.createObjectStore("messages", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("push")) {
        db.createObjectStore("push", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("notifications")) {
        db.createObjectStore("notifications", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("tmp")) {
        db.createObjectStore("tmp", { keyPath: "id" });
      }
    };

    request.onsuccess = (event) => {
      this.db = event.target.result;
      resolve(this.db);
    };

    request.onerror = (event) => reject(event.target.error);
  });
}

// Register a listener
onChange(listener) {
   this.listeners.push(listener); 
  }

  // Notify all listeners with current data
  async notifyChange() {
     const all = await this.getAll();
      this.listeners.forEach(fn => fn(all));
     }

  // CREATE or UPDATE
  async save(item) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.storeName, "readwrite");
      const store = tx.objectStore(this.storeName);
      const request = store.put(item);

      request.onsuccess = async () => {
        await this.notifyChange();
        resolve(request.result); // returns id
      };
      request.onerror = (event) => reject(event.target.error);
    });
  }

  // READ single item
  async get(id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.storeName, "readonly");
      const store = tx.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = (event) => reject(event.target.error);
    });
  }

  // READ single item by field
async findByField(field, value) {
  return new Promise((resolve, reject) => {
    const tx = this.db.transaction(this.storeName, "readonly");
    const store = tx.objectStore(this.storeName);

    let found = null;

    store.openCursor().onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        if (cursor.value[field] === value) {
          found = cursor.value;
          resolve(found); // return first match
          return; // stop scanning
        }
        cursor.continue();
      } else {
        resolve(found); // null if not found
      }
    };

    tx.onerror = (event) => reject(event.target.error);
  });
}

  // READ all items
  async getAll() {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.storeName, "readonly");
      const store = tx.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = (event) => reject(event.target.error);
    });
  }

  // DELETE single item
  async delete(id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.storeName, "readwrite");
      const store = tx.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = async () => {
        await this.notifyChange();
         resolve(true);
      };
      request.onerror = (event) => reject(event.target.error);
    });
  }

  // DELETE single item by field
 async deleteByField(field, value) {
  return new Promise((resolve, reject) => {
    const tx = this.db.transaction(this.storeName, "readwrite");
    const store = tx.objectStore(this.storeName);
    let deleted = false;

    store.openCursor().onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        if (cursor.value[field] === value) {
          store.delete(cursor.primaryKey);
          deleted = true;
        }
        cursor.continue();
      } else {
        resolve(deleted);
      }
    };

    tx.onerror = (event) => reject(event.target.error);
  });
}


  // CLEAR all items
  async clear() {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.storeName, "readwrite");
      const store = tx.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => resolve(true);
      request.onerror = (event) => reject(event.target.error);
    });
  }
}
 

function fc_showMessenger_fnc(fc_cfg_rev, fc_user_public_key, fc_user_secret_key) {

  window.fc_cfg = fc_cfg_rev;
  fc_cfg = window.fc_cfg;

  if (!fc_cfg || !fc_cfg.widget_id) return;

    fc_ensureMessengerStyles_fnc();

  const fc_win = document.getElementById(`fc-messenger-window-${fc_cfg.widget_id}`);
  if (!fc_win) return;

  // Clear existing content
  fc_win.textContent = "";

  // Create fragment to reduce reflows
  const frag = fc_fragment_fnc();

  // Header
  frag.appendChild(fc_el_fnc("div", `fc-header-${fc_cfg.widget_id}`, { text: fc_safeText_fnc(fc_cfg.title) }));

  // Self Info
  const selfInfo = fc_el_fnc("div", `fc-self-info-${fc_cfg.widget_id}`, { id: `fc-self-info-${fc_user_public_key}` });
  selfInfo.appendChild(fc_el_fnc("img", `fc-dp-${fc_cfg.widget_id} fc-away-${fc_cfg.widget_id}`, { src: "", alt: "" }));

  // Create edit icon element
const editIcon = fc_el_fnc(
  "span",
  `fc-edit-icon-${fc_cfg.widget_id}`,
  { text: "✎" }
);

// Make it look clickable
editIcon.title = "Edit profile";

// Attach click handler
editIcon.addEventListener("click", () => {
  // Call your edit profile function
  fc_edit_profile_fnc(fc_user_public_key, fc_user_secret_key);
});

// Append to self info container
selfInfo.appendChild(editIcon);

  const titleDiv = fc_el_fnc("div", `fc-title-${fc_cfg.widget_id}`);
  titleDiv.appendChild(fc_el_fnc("p", `fc-nickname-${fc_cfg.widget_id} fc-statusColor-${fc_cfg.widget_id} fc-away-${fc_cfg.widget_id}`));
  titleDiv.appendChild(fc_el_fnc("p", `fc-status-${fc_cfg.widget_id}`));
  selfInfo.appendChild(titleDiv);

  // Icons
  const iconsDiv = fc_el_fnc("div", `fc-icons-${fc_cfg.widget_id}`);


  // Location
  const locaDiv = fc_el_fnc("div", `fc-location-${fc_cfg.widget_id}`);
const locaLink = fc_el_fnc("a", `fc-lnk-${fc_cfg.widget_id}`, {
  href: "#", // prevent default navigation
  title: "Location",
  "aria-label": "Location"
});
locaLink.innerHTML = `
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
  <path fill-rule="evenodd" d="M8 0a5 5 0 0 0-5 5c0 3.75 5 11 5 11s5-7.25 5-11a5 5 0 0 0-5-5zm0 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/>
</svg>
`;

locaLink.addEventListener("click", async (e) => {
  e.preventDefault(); // stop default link navigation

  const fc_attemptGeo_fnc = () => {
    fc_alert_fnc("Please Wait...", "info");

    if (navigator.geolocation && typeof navigator.geolocation.getCurrentPosition === "function") {
      navigator.geolocation.getCurrentPosition(
        async pos => {
          // Store coordinates globally
          window.fc_lat = pos.coords.latitude;
          window.fc_lon = pos.coords.longitude;

          // Cast to string for safe backend validation
          const fc_data = {
            latitude: String(pos.coords.latitude),
            longitude: String(pos.coords.longitude),
            offset: fc_offset // should already be a string like "+05:00"
          };

          // Per-chat double-submit guard
          const fc_lockKey = `fc_location_lock_${fc_cfg.widget_id}`;
          if (window[fc_lockKey]) return;
          window[fc_lockKey] = true;

          try {
            await fc_realTime_fnc(
              "location_update",
              fc_user_public_key,
              fc_user_secret_key,
              fc_user_id,
              fc_data,
              response => {
                if (response) {
                  fc_alert_fnc("Location updated", "success");
                }
              }
            );
          } catch {
            fc_alert_fnc("Location update failed", "danger");
          } finally {
            // Always release lock
            setTimeout(() => {
              window[fc_lockKey] = false;
            }, 9000);
          }
        },
        err => {
          let msg = "Location access denied or unavailable";
          if (err && typeof err.code === "number") {
            switch (err.code) {
              case 1: msg = "Location access denied by user"; break;
              case 2: msg = "Location unavailable"; break;
              case 3: msg = "Location request timed out"; break;
            }
          }
          fc_alert_fnc(msg, "warning");
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    } else {
      fc_alert_fnc("Geolocation not supported", "danger");
    }
  };

  // Initial attempt
  fc_attemptGeo_fnc();
});


locaDiv.appendChild(locaLink);
iconsDiv.appendChild(locaDiv);

// Sound toggle
const soundDiv = fc_el_fnc("div", `fc-sound-${fc_cfg.widget_id}`);
const soundLink = fc_el_fnc("a", `fc-lnk-${fc_cfg.widget_id}`, {
  href: "#",
  title: "Sound",
  "aria-label": "Sound"
});

// Initial state from cookie (default: unmuted)
let soundState = fc_getCookie_fnc("fc_sound") || "unmuted";

// Render icon based on state
function renderSoundIcon(state) {
  if (state === "muted") {
    window.fc_sound_muted = true;
    soundLink.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M3 9v6h4l5 5V4L7 9H3z"/>
</svg>`;
    soundLink.title = "Unmute";
  } else {
    window.fc_sound_muted = false;
    soundLink.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M3 9v6h4l5 5V4L7 9H3zm14.5 3a4.5 4.5 0 0 0-1.5-3.5l-1 1a3.5 3.5 0 0 1 0 5l1 1a4.5 4.5 0 0 0 1.5-3.5zM18 8l-2 2m0 4 2 2"/>
</svg>`;
    soundLink.title = "Mute";
  }
}

// Toggle handler
soundLink.addEventListener("click", e => {
  e.preventDefault();
  soundState = soundState === "muted" ? "unmuted" : "muted";
  fc_setCookie_fnc("fc_sound", soundState);
  renderSoundIcon(soundState);


});

// Initial render
renderSoundIcon(soundState);

soundDiv.appendChild(soundLink);
iconsDiv.appendChild(soundDiv);


  // Notifications
 const notifDiv = fc_el_fnc("div", `fc-notifications-${fc_cfg.widget_id}`);

const notifBadge = fc_el_fnc("span", ``, {
  id: `fc-notifications-badge-${fc_cfg.widget_id}`,
  text: ""
});

const notifLink = fc_el_fnc("a", `fc-lnk-${fc_cfg.widget_id}`, {
  id: `fc-notifications-icon-${fc_cfg.widget_id}`,
  href: "#",
  title: "Notifications",
  "aria-label": "Notifications"
});
notifLink.innerHTML = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="16" height="16" fill="currentColor" aria-hidden="true" role="img">
    <path d="M224 0c-17.7 0-32 14.3-32 32V51.2C119 66 64 130.6 64 208v18.8c0 47-17.3 92.4-48.5 127.6l-7.4 8.3c-8.4 9.4-10.4 22.9-5.3 34.4S19.4 416 32 416H416c12.6 0 24-7.4 29.2-18.9s3.1-25-5.3-34.4l-7.4-8.3C401.3 319.2 384 273.9 384 226.8V208c0-77.4-55-142-128-156.8V32c0-17.7-14.3-32-32-32zm45.3 493.3c12-12 18.7-28.3 18.7-45.3H224 160c0 17 6.7 33.3 18.7 45.3s28.3 18.7 45.3 18.7s33.3-6.7 45.3-18.7z"/>
  </svg>
`;

// Use append instead of appendChild
notifDiv.append(notifBadge, notifLink);

// Notifications list container
const notifList = fc_el_fnc("ul", `fc-notifications-menu-${fc_cfg.widget_id}`, {
  id: `fc-notifications-${fc_cfg.widget_id}`
});
notifDiv.appendChild(notifList);

iconsDiv.appendChild(notifDiv);


  // Logout
  const logoutDiv = fc_el_fnc("div", `fc-logout-${fc_cfg.widget_id}`);
const logoutLink = fc_el_fnc("a", `fc-lnk-${fc_cfg.widget_id}`, {
  href: "#", // prevent default navigation
  title: "Logout",
  "aria-label": "Logout"
});
logoutLink.innerHTML = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="16" height="16" fill="currentColor" aria-hidden="true" role="img">
    <path d="M377.9 105.9L500.7 228.7c7.2 7.2 11.3 17.1 11.3 27.3s-4.1 20.1-11.3 27.3L377.9 406.1c-6.4 6.4-15 9.9-24 9.9c-18.7 0-33.9-15.2-33.9-33.9l0-62.1-128 0c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l128 0 0-62.1c0-18.7 15.2-33.9 33.9-33.9c9 0 17.6 3.6 24 9.9zM160 96L96 96c-17.7 0-32 14.3-32 32l0 256c0 17.7 14.3 32 32 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-64 0c-53 0-96-43-96-96L0 128C0 75 43 32 96 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32z"/>
  </svg>
`;

// 👉 Attach click handler
logoutLink.addEventListener("click", (e) => {
  e.preventDefault(); // stop default link navigation

  const fc_chatBtn = document.getElementById(`fc-chat-btn-${fc_cfg.widget_id}`);
  const fc_msgWin = document.getElementById(`fc-messenger-window-${fc_cfg.widget_id}`);

  fc_removeElement_fnc(fc_msgWin, 300);
  fc_removeElement_fnc(fc_chatBtn, 600);
  
        fc_deleteCookie_fnc('fc_user_public_key');
        fc_deleteCookie_fnc('fc_user_secret_key');
        fc_setCookie_fnc('fc_user_public_key', '');
        fc_setCookie_fnc('fc_user_secret_key', '');
});

logoutDiv.appendChild(logoutLink);
iconsDiv.appendChild(logoutDiv);


  selfInfo.appendChild(iconsDiv);
  frag.appendChild(selfInfo);

  // Tabs
  const tabsDiv = fc_el_fnc("div", `fc-tabs-${fc_cfg.widget_id}`);
  tabsDiv.setAttribute("role", "tablist");
  tabsDiv.setAttribute("aria-label", "Messenger tabs");

 ["chats", "nearby", "rooms"].forEach((tabName, i) => {
  const tab = fc_el_fnc(
    "div",
    `fc-tab-${fc_cfg.widget_id}${i === 0 ? ` fc-active-${fc_cfg.widget_id}` : ""}`,
    {
      text: tabName.charAt(0).toUpperCase() + tabName.slice(1),
      "data-tab": tabName,
      id: `fc-${tabName}Tab-${fc_cfg.widget_id}`,
      role: "tab",
      tabindex: 0,
      "aria-selected": i === 0 ? "true" : "false"
    }
  );

  // Add badge only for Chats tab
  if (tabName === "chats") {
    const badge = fc_el_fnc("span", ``, {
      id: `fc-chats-badge-${fc_cfg.widget_id}`,
      text: "" // start empty
    });
    tab.appendChild(badge);
  }

  tabsDiv.appendChild(tab);
});

  frag.appendChild(tabsDiv);
  

  // Tab contents
  const tabsContents = fc_el_fnc("div", `fc-tabsContents-${fc_cfg.widget_id}`, { id: `fc-tabsContents-${fc_cfg.widget_id}` });
  ["chats", "nearby", "rooms"].forEach((tabName, i) => {
    const tabContent = fc_el_fnc("div", `fc-tabContent-${fc_cfg.widget_id}${i === 0 ? ` fc-active-${fc_cfg.widget_id}` : ""}`, {
      id: `fc-list-${tabName}-${fc_cfg.widget_id}`,
      role: "tabpanel",
      "aria-labelledby": `fc-${tabName}Tab-${fc_cfg.widget_id}`
    });

    
    if (tabName === "chats") {
  const searchWrap = fc_el_fnc("div", `fc-searchWrap-${fc_cfg.widget_id}`);

  const labelInput = fc_el_fnc("label", "");
  labelInput.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24"
         xmlns="http://www.w3.org/2000/svg" fill="none">
      <circle cx="11" cy="11" r="7"
              stroke="currentColor" stroke-width="2"/>
      <line x1="16.65" y1="16.65" x2="22" y2="22"
            stroke="currentColor" stroke-width="2"
            stroke-linecap="round"/>
    </svg>
  `;

  const searchInput = fc_el_fnc("input", `fc-search-${fc_cfg.widget_id}`, {
    id: `fc-search-${fc_cfg.widget_id}`,
    type: "text",
    placeholder: "Search chats..."
  });

  searchWrap.append(labelInput, searchInput);
  tabContent.appendChild(searchWrap);

   let debounceTimer;
  searchInput.addEventListener("input", e => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const query = e.target.value.trim().toLowerCase();
      const chatList = document.getElementById(`fc-chats-${fc_cfg.widget_id}`);
      if (!chatList) return;
      chatList.querySelectorAll("li").forEach(li => {
        li.style.display = li.textContent.toLowerCase().includes(query) ? "" : "none";
      });
    }, 150); // debounce 150ms
  });
  
}



    tabContent.appendChild(fc_el_fnc("ul", "", { id: `fc-${tabName}-${fc_cfg.widget_id}` }));
    tabsContents.appendChild(tabContent);
  });
  frag.appendChild(tabsContents);

  // Footer
  const footer = fc_el_fnc("div", `fc-footer-${fc_cfg.widget_id}`);
  const footerLink = fc_el_fnc("a", "", { href: "https://fishingcab.com", target: "_blank", rel: "noopener noreferrer", text: "FishingCab.com" });
  footer.appendChild(fc_el_fnc("span", "", { text: "Powered by " }));
  footer.appendChild(footerLink);
  frag.appendChild(footer);

  // Append to window
  fc_win.appendChild(frag);

  // Tabs event handling
  const tabs = fc_qsa_fnc(`.fc-tab-${fc_cfg.widget_id}`, fc_win);
  tabs.forEach(tab => {
    const activate = () => {
      tabs.forEach(t => { t.classList.remove(`fc-active-${fc_cfg.widget_id}`); t.setAttribute("aria-selected", "false"); });
      tab.classList.add(`fc-active-${fc_cfg.widget_id}`);
      tab.setAttribute("aria-selected", "true");
      if (typeof fc_loadTab_fnc === "function") {
        fc_loadTab_fnc(tab.dataset.tab, fc_user_public_key, fc_user_secret_key);
      }
    };
    tab.addEventListener("click", activate);
    tab.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") activate(); });
  });
}




function fc_token_fnc(length, chars = 'aA#') {
  const sets = {
    a: 'abcdefghijklmnopqrstuvwxyz',
    A: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    '#': '0123456789',
    '!': '~`!@#$%^&*()_+-={}[]:";\'<>?,./|\\'
  };

  // Build mask by scanning each character in `chars`
  let mask = '';
  for (let i = 0; i < chars.length; i++) {
    const set = sets[chars[i]];
    if (set) mask += set;
  }

  // If user passed combined flags like "aA#" or "aA#!", handle them
  if (sets[chars]) {
    mask = sets[chars];
  }

  // Generate token
  let result = '';
  const maskLength = mask.length;
  for (let i = 0; i < length; i++) {
    result += mask[Math.floor(Math.random() * maskLength)];
  }
  return result;
}


/* ===============================
   GLOBAL CONTROLS
   =============================== */
window.fc_priorityLock = false;            // TRUE = fc_realTime_fnc running
window.fc_pushLock = false;                // TRUE = fc_processPush_fnc running
window.fc_streamBackoff = 1000;            // reconnect delay (ms)
window.fc_streamBackoffMax = 15000;        // max backoff (ms)
window.fc_last_user_public = null;         // last user public key
window.fc_last_user_secret = null;         // last user secret key

window.fc_ws = null;
window.fc_wsActive = false;
window.fc_wsConnecting = false;
window.fc_wsReconnectTimer = null;
window.fc_heartbeatTimer = null;

function fc_resetBackoff_fnc() {
  window.fc_streamBackoff = 1000;
}

function fc_increaseBackoff_fnc() {
  window.fc_streamBackoff = Math.min(
    window.fc_streamBackoff * 2,
    window.fc_streamBackoffMax
  );
}

function fc_safeCloseWS_fnc() {
  try {
    if (window.fc_ws) {
      window.fc_ws.onopen =
      window.fc_ws.onmessage =
      window.fc_ws.onerror =
      window.fc_ws.onclose = null;
      window.fc_ws.close();
    }
  } catch (_) {}

  window.fc_ws = null;
  window.fc_wsActive = false;
  window.fc_wsConnecting = false;

  if (window.fc_heartbeatTimer) {
    clearInterval(window.fc_heartbeatTimer);
    window.fc_heartbeatTimer = null;
  }
}


function fc_openWS_fnc(fc_user_public_key, fc_user_secret_key) {
  if (window.fc_wsActive || window.fc_wsConnecting) return;

  window.fc_wsConnecting = true;

  fc_safeCloseWS_fnc();

  const socket = new WebSocket("wss://ws.fishingcab.com");
  window.fc_ws = socket;

  // HEARTBEAT (SINGLE INSTANCE)
  const startHeartbeat = () => {
    if (window.fc_heartbeatTimer) return;

    window.fc_heartbeatTimer = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);
  };

  const stopHeartbeat = () => {
    if (window.fc_heartbeatTimer) {
      clearInterval(window.fc_heartbeatTimer);
      window.fc_heartbeatTimer = null;
    }
  };

  socket.onopen = () => {
    window.fc_wsActive = true;
    window.fc_wsConnecting = false;
    fc_resetBackoff_fnc();

    socket.send(JSON.stringify({ user_id: fc_user_id }));

    startHeartbeat();

    if (!document.hidden) {
      document.querySelectorAll("[id^='fc-chat-win-']").forEach(el => {
        const id = el.id.replace("fc-chat-win-", "");
        setTimeout(() => {
          fc_try_auto_tmp_fnc(id, fc_user_public_key, fc_user_secret_key);
        }, 800);
      });
    }

    fc_processPush_fnc(fc_user_public_key, fc_user_secret_key);
  };

  socket.onmessage = (event) => {
    let data;
    try { data = JSON.parse(event.data); }
    catch { return; }

    if (data.type === "pong") return;

    if (data.event === "update") {
      if (!window.fc_priorityLock) {
        fc_realTime_fnc("stream", fc_user_public_key, fc_user_secret_key);
      }
    }
  };

  socket.onerror = () => {
    socket.close();
  };

  socket.onclose = () => {
    stopHeartbeat();
    window.fc_wsActive = false;
    window.fc_wsConnecting = false;

    if (document.hidden) return;

    if (!window.fc_wsReconnectTimer) {
      window.fc_wsReconnectTimer = setTimeout(() => {
        window.fc_wsReconnectTimer = null;
        fc_increaseBackoff_fnc();
        fc_openWS_fnc(fc_user_public_key, fc_user_secret_key);
      }, window.fc_streamBackoff);
    }
  };
}




/* ===============================
   HIGH PRIORITY REALTIME FUNCTION
   =============================== */
async function fc_realTime_fnc(
  fc_action,
  fc_user_public_key,
  fc_user_secret_key,
  fc_id = 0,
  fc_data = "",
  fc_callback = null
) {
  // --- Validation ---
  if (!window.fc_cfg?.widget_id) {
    return false;
  }
  if (!fc_action || !fc_user_public_key || !fc_user_secret_key) {
    return false;
  }

  // --- Prevent duplicate runs ---
  if (window.fc_priorityLock) {
    return false;
  }
  window.fc_priorityLock = true;

  // --- Reset backoff before starting ---
 // fc_resetBackoff();

  // --- Process pending pushes first ---
  try {
    await fc_processPush_fnc(fc_user_public_key, fc_user_secret_key);
  } catch (err) {
  }

  try {
    // --- URL selection ---
    const actionMap = {
      conversation: "conversation",
      profile_update: "profile_update",
      location_update: "location_update"
    };
    let fc_url = `${fc_base_url}${actionMap[fc_action] || "chat"}/${encodeURIComponent(window.fc_cfg.widget_id)}`;

    const fc_timeout = 9000;
    const fc_max_retries = 3;

    // --- Headers ---
    const fc_headers = {
      "X-Requested-With": "XMLHttpRequest",
      "Accept": "application/json"
    };

    // --- Body construction ---
    let fc_body;
    switch (fc_action) {
      case "send_file":
        if (!(fc_data instanceof FormData)) {
          return false;
        }
        fc_data.append("do", fc_action);
        fc_data.append("user_public_key", fc_user_public_key);
        fc_data.append("user_secret_key", fc_user_secret_key);
        fc_data.append("id", fc_id);
        fc_data.append("offset", fc_offset);
        fc_data.append("latitude", fc_latitude);
        fc_data.append("longitude", fc_longitude);
        fc_data.append("token", fc_token_fnc(8));

        const fileInput = document.getElementById(`fc-file-${fc_id}`);
        if (fileInput?.files?.[0]) {
          fc_data.append("data", fileInput.files[0]);
        }
        fc_body = fc_data; // FormData → no content-type header
        break;

      case "conversation":
        fc_body = `conversation_id=${encodeURIComponent(fc_id)}&user_id=${encodeURIComponent(fc_data)}`;
        fc_headers["Content-Type"] = "application/x-www-form-urlencoded";
        break;

      case "profile_update":
      case "location_update":
        fc_body = `user_public_key=${encodeURIComponent(fc_user_public_key)}&user_secret_key=${encodeURIComponent(fc_user_secret_key)}&data=${encodeURIComponent(JSON.stringify(fc_data))}`;
        fc_headers["Content-Type"] = "application/x-www-form-urlencoded";
        break;

      default:
        fc_body = `do=${encodeURIComponent(fc_action)}&user_public_key=${encodeURIComponent(fc_user_public_key)}&user_secret_key=${encodeURIComponent(fc_user_secret_key)}&id=${encodeURIComponent(fc_id)}&data=${encodeURIComponent(fc_data)}&offset=${fc_offset}&latitude=${fc_latitude}&longitude=${fc_longitude}&token=${fc_token_fnc(8)}`;
        fc_headers["Content-Type"] = "application/x-www-form-urlencoded";
    }

    // --- Fetch with timeout ---
    const fetchWithTimeout = (url, options, timeout) => {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), timeout);
      return fetch(url, { ...options, signal: controller.signal })
        .finally(() => clearTimeout(t));
    };

    // --- Retry loop with backoff ---
    let attempt = 0;
    while (attempt <= fc_max_retries) {
      try {
        const res = await fetchWithTimeout(fc_url, { method: "POST", headers: fc_headers, body: fc_body }, fc_timeout);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();
        if (typeof fc_doUpdates_fnc === "function") {
          fc_doUpdates_fnc(json, fc_action, fc_user_public_key, fc_user_secret_key);
        }
        if (typeof fc_callback === "function") {
          fc_callback(json);
        }

        return true;
      } catch (err) {
        if (attempt >= fc_max_retries) return false;
        await new Promise(r => setTimeout(r, 600 * (attempt + 1))); // exponential backoff
      }
      attempt++;
    }

    return false;

  } finally {
    // --- Release lock and resume updates ---
    window.fc_priorityLock = false;

    if (fc_user_secret_key && typeof fc_getUpdates_fnc === "function" && !window.fc_wsActive) {
      setTimeout(() => {
        fc_getUpdates_fnc("initialize", window.fc_cfg, fc_user_public_key, fc_user_secret_key);
      }, 600);
    }
  }
}



async function fc_processPush_fnc(fc_user_public_key, fc_user_secret_key) {
  // Only run if not already locked
  if (window.fc_pushLock) return;
  window.fc_pushLock = true;

  try {
    const pushDB = new IndexedDBWrapper(fc_user_public_key, "push");
    await pushDB.init();

    const allPushes = await pushDB.getAll();
    for (const push of allPushes) {
      const success = await fc_push_fnc(push, fc_user_public_key, fc_user_secret_key); // async-safe
      if (success) {
        try {
          await pushDB.delete(push.id);
        } catch (err) {
        }
      }
    }
  } catch (err) {
  } finally {
    // Always release lock
    window.fc_pushLock = false;
  }
}



/* ===============================
   LOW PRIORITY REALTIME (WebSocket)
   =============================== */
function fc_getUpdates_fnc(fc_action, fc_cfg_rev, fc_user_public_key, fc_user_secret_key) {
  if (fc_action !== "initialize") return;
  if (!fc_cfg_rev?.widget_id || !fc_user_id) return;

  window.fc_cfg = fc_cfg_rev;
  window.fc_last_user_public = fc_user_public_key;
  window.fc_last_user_secret = fc_user_secret_key;

  if (window.fc_priorityLock) return;

  fc_openWS_fnc(fc_user_public_key, fc_user_secret_key);
}




async function fc_delete_messages_fnc(fc_chat_id, fc_user_public_key, fc_user_secret_key) {
  if (!fc_cfg || !fc_cfg.widget_id) return;

  const fc_inputEl = document.getElementById(`fc-text-input-${fc_chat_id}`);
  if (!fc_inputEl) return;

   const fc_formEl = document.getElementById(`fc-input-${fc_chat_id}`);
  const fc_controls = fc_formEl
    ? Array.from(fc_formEl.querySelectorAll(":scope input, :scope button, :scope textarea, :scope select"))
    : [];

    // Confirm dialog 
    const proceed = window.confirm(
  "Are you sure you want to delete all messages in this chat?\n\nThis action is permanent and the messages cannot be recovered."
);
    if (!proceed) return; // user cancelled

  // Per-chat double-submit guard
  const fc_lockKey = `fc_delete_messages_lock_${fc_chat_id}`;
  if (window[fc_lockKey]) return;
  window[fc_lockKey] = true;

  // Disable inputs
  fc_toggle_controls_fnc(fc_controls, true);

  try {
    const response = await fc_realTime_fnc(
      "delete_messages",
      fc_user_public_key,
      fc_user_secret_key,
      fc_chat_id,
      '',
      function (response) {
        if (!response) return;
      }
    );
    return response;
  } finally {
    // Always re-enable inputs and release per-chat lock    
    setTimeout(() => {
      fc_toggle_controls_fnc(fc_controls, false);
      if (fc_inputEl) fc_inputEl.focus();
      window[fc_lockKey] = false;
    }, 1000);
  }
}



async function fc_exit_room_fnc(fc_chat_id, fc_user_public_key, fc_user_secret_key) {
  if (!fc_cfg?.widget_id) return;

  const fc_inputEl = document.getElementById(`fc-text-input-${fc_chat_id}`);
  if (!fc_inputEl) return;

  const fc_formEl = document.getElementById(`fc-input-${fc_chat_id}`);
  const fc_controls = fc_formEl
    ? Array.from(fc_formEl.querySelectorAll(":scope input, :scope button, :scope textarea, :scope select"))
    : [];

   
const proceed = window.confirm(
  "Are you sure you want to exit this chat room?\n\n" +
  "⚠️ Important:\n" +
  "- All your messages in this room will be permanently deleted and cannot be recovered.\n" +
  "- Each room allows a maximum of 20 participants.\n" +
  "- If you leave and the room becomes full, you will NOT be able to rejoin until someone else leaves.\n\n" +
  "Do you want to continue?"
);


if (!proceed) return;

// Per-chat double-submit guard
  const fc_lockKey = `fc_exit_room_lock_${fc_chat_id}`;
  if (window[fc_lockKey]) return;
  window[fc_lockKey] = true;

  // Disable inputs
  fc_toggle_controls_fnc(fc_controls, true);

  try {
    const response = await fc_realTime_fnc(
      "exit_room",
      fc_user_public_key,
      fc_user_secret_key,
      fc_chat_id,
      '',
      function (response) {
      if (!response) return;

      const fc_chatWin = `#fc-chat-win-${fc_chat_id}`;
      const fc_chat  = `#fc-chat-${fc_chat_id}`;

      const fc_chatWinEl = fc_qs_fnc(fc_chatWin);
      if (!fc_chatWinEl) return false; 
      fc_removeElement_fnc(fc_chatWinEl, 300);

        const fc_chatEl = fc_qs_fnc(fc_chat);
        if (!fc_chatEl) return false; 
        fc_removeElement_fnc(fc_chatEl, 300);
      }
    );
    return response;
  } finally {
    // Always re-enable inputs and release per-chat lock    
    setTimeout(() => {
      window[fc_lockKey] = false;
    }, 1000);
  }
}

async function fc_member_block_fnc(fc_user_id, fc_chat_id, fc_user_public_key, fc_user_secret_key) {
  if (!fc_cfg?.widget_id || !fc_user_id || !fc_chat_id) return;

  const fc_participantId = `fc-participant-${fc_user_id}`;
  const fc_participantEl = document.getElementById(fc_participantId);
  if (!fc_participantEl) return;

  const fc_inputEl = document.getElementById(`fc-text-input-${fc_chat_id}`);
  if (!fc_inputEl) return;

  const fc_formEl = document.getElementById(`fc-input-${fc_chat_id}`);
  const fc_controls = fc_formEl
    ? Array.from(fc_formEl.querySelectorAll(":scope input, :scope button, :scope textarea, :scope select"))
    : [];

  // Confirmation dialog
  const proceed = window.confirm(
    "Are you sure you want to block this user from this room?\n\n" +
    "- The user will not be able to rejoin this room for the next 24 hours.\n" +
    "- You cannot unblock this user once blocked.\n" +
    "- All of this user's messages will be permanently deleted."
  );
  if (!proceed) return; // user cancelled

  // Per-user lock
  const fc_lockKey = `fc_member_block_lock_${fc_user_id}`;
  if (window[fc_lockKey]) return;
  window[fc_lockKey] = true;

  // Disable inputs
  fc_toggle_controls_fnc(fc_controls, true);

  try {
    const response = await fc_realTime_fnc(
      "member_block",
      fc_user_public_key,
      fc_user_secret_key,
      fc_user_id,
      fc_chat_id,
      function (res) {
        if (!res) return;

        // Remove participant element with animation
          fc_removeElement_fnc(fc_participantEl, 300);
        
      }
    );
    return response;
  } finally {
    // Always re-enable inputs and release lock
    fc_toggle_controls_fnc(fc_controls, false);
    setTimeout(() => {
      window[fc_lockKey] = false;
    }, 1000);
  }
}


async function fc_user_block_fnc(fc_user_id, fc_chat_id, fc_user_public_key, fc_user_secret_key) {
  if (!fc_cfg || !fc_cfg.widget_id) return;
  const fc_inputEl = document.getElementById(`fc-text-input-${fc_chat_id}`);
  if (!fc_inputEl) return;

  const fc_formEl = document.getElementById(`fc-input-${fc_chat_id}`);
  const fc_controls = fc_formEl
    ? Array.from(fc_formEl.querySelectorAll(":scope input, :scope button, :scope textarea, :scope select"))
    : [];

     const proceed = window.confirm(
  "Are you sure you want to block this user?\n\n" +
  "• You will not be able to chat with this user for the next 24 hours.\n" +
  "• You will not see this user during this period.\n" +
  "• This conversation will be deleted.\n" +
  "• All messages in this conversation will be permanently deleted and cannot be recovered.\n\n" +
  "After 24 hours, you may send a new chat request. You can chat again only if the user accepts."
);

    if (!proceed) return; // user cancelled

    // Per-chat double-submit guard
  const fc_lockKey = `fc_user_block_lock_${fc_user_id}`;
  if (window[fc_lockKey]) return;
  window[fc_lockKey] = true;

  // Disable inputs
  fc_toggle_controls_fnc(fc_controls, true);

  try {
    const response = await fc_realTime_fnc(
      "user_block",
      fc_user_public_key,
      fc_user_secret_key,
      fc_user_id,
      '',
      function (response) {
      if (!response) return;

      const fc_chatWin = `#fc-chat-win-${fc_chat_id}`;
      const fc_chat  = `#fc-chat-${fc_chat_id}`;

      const fc_chatWinEl = fc_qs_fnc(fc_chatWin);
      if (!fc_chatWinEl) return false; 
      fc_removeElement_fnc(fc_chatWinEl, 300);

        const fc_chatEl = fc_qs_fnc(fc_chat);
        if (!fc_chatEl) return false; 
        fc_removeElement_fnc(fc_chatEl, 300);
      }
    );
    return response;
  } finally {
    // Always re-enable inputs and release per-chat lock    
    setTimeout(() => {
      window[fc_lockKey] = false;
    }, 1000);
  }

}

async function fc_chat_accept_fnc(fc_user_id, fc_user_public_key, fc_user_secret_key) {
  if (!fc_cfg?.widget_id) return;

  // Per-user double-submit guard
  const fc_lockKey = `fc_chat_accept_lock_${fc_user_id}`;
  if (window[fc_lockKey]) return;
  window[fc_lockKey] = true;

  try {
    const response = await fc_realTime_fnc(
      "chat_accept",
      fc_user_public_key,
      fc_user_secret_key,
      fc_user_id,
      "",
      function (res) {
        if (!res) return;
        fc_alert_fnc("Chat accept successfully!", "success");
      }
    );

    return response;

  } finally {
    // Release lock after 1s
    setTimeout(() => {
      window[fc_lockKey] = false;
    }, 1000);
  }
}



async function fc_view_users_fnc(fc_chat_id, fc_user_public_key, fc_user_secret_key) {
  // Guards
  if (!fc_cfg?.widget_id || !fc_chat_id) return;

  const chatWin = document.getElementById(`fc-chat-win-${fc_chat_id}`);
  if (!chatWin) return;

  // Per-chat lock (anti double open)
  const lockKey = `fc_view_users_lock_${fc_chat_id}`;
  if (window[lockKey]) return;
  window[lockKey] = true;

  // Cache
  const widgetId = fc_cfg.widget_id;

  try {
    return await fc_realTime_fnc(
      "conversation",
      fc_user_public_key,
      fc_user_secret_key,
      fc_chat_id,
      fc_user_id,
      function (res) {
        if (!res?.data) return;

        const { users, participants, chat } = res.data;
        if (!users || !participants?.length || !chat?.room_id) return;

        const room = fc_push_rooms?.[chat.room_id];
        if (!room) return;

        const fragment = document.createDocumentFragment();

        // MAIN CONTAINER
        const container = fc_el_fnc("div", `fc-profile-container-${widgetId}`);

        // LEFT COLUMN (ROOM INFO)
        const leftCol = fc_el_fnc("div", `fc-profile-left-${widgetId}`);
        const avatarWrap = fc_el_fnc("div", `fc-avatar-wrap-${widgetId}`);

        avatarWrap.append(
          fc_el_fnc("span", `fc-statusDot-${widgetId} fc-online-${widgetId}`),
          fc_el_fnc("img", `fc-online-${widgetId}`, {
            src: fc_dp_fnc("room"),
            alt: "Room",
            title: "Room"
          })
        );

        leftCol.append(
          avatarWrap,
          fc_el_fnc(
            "div",
            `fc-statusText-${widgetId} fc-statusColor-${widgetId} fc-online-${widgetId}`,
            { text: fc_safeText_fnc(room.title) }
          )
        );

        // RIGHT COLUMN (PARTICIPANTS)
        const rightCol = fc_el_fnc("div", `fc-profile-right-${widgetId}`);
        const isCurrentAdmin = String(fc_user_id) === String(chat.admin_id);

        for (const part of participants) {
          const user = users[part.user_id];
          if (!user) continue;

          const isAdmin = String(user.user_id) === String(chat.admin_id);
          const canBlock = isCurrentAdmin && !isAdmin;

          const row = fc_el_fnc("div", `fc-profile-row-${widgetId}`, {id: `fc-participant-${user.user_id}`});

          // LEFT: USER DP + NAME
          const userWrap = fc_el_fnc("div", `fc-profile-label-${widgetId}`);

          const safeStatus = String(user.status || "offline").toLowerCase();
          const img = fc_el_fnc(
            "img",
            `fc-dp-${widgetId} fc-${safeStatus}-${widgetId}`,
            {
              src: fc_dp_fnc(user.gender || "unknown"),
              alt: fc_safeText_fnc(user.nickname || "User"),
              title: fc_safeText_fnc(user.nickname || "User")
            }
          );

          img.style.cursor = "pointer";
          img.addEventListener("click", () => {
            fc_view_profile_fnc(
              "Profile",
              user.user_id,
              false,
              false,
              fc_user_public_key,
              fc_user_secret_key
            );
          }, { passive: true });

          userWrap.append(
            img,
            fc_el_fnc("span", `fc-name-${widgetId}`, {
              text: ` ${fc_safeText_fnc(user.nickname)}`
            })
          );

          // RIGHT: ROLE / ACTION
          let actionEl;

          if (isAdmin) {
            actionEl = fc_el_fnc(
              "div",
              `fc-profile-value-${widgetId} fc-admin-${widgetId}`,
              { text: "Admin" }
            );
          } else if (canBlock) {
            actionEl = fc_el_fnc(
              "div",
              `fc-profile-value-${widgetId} fc-block-${widgetId}`
            );
            actionEl.innerHTML = `
              <svg width="14" height="14" viewBox="0 0 24 24"
                   xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
                <circle cx="12" cy="12" r="10"
                        fill="none" stroke="currentColor" stroke-width="2"></circle>
                <line x1="6" y1="18" x2="18" y2="6"
                      stroke="currentColor" stroke-width="2" stroke-linecap="round"></line>
              </svg>
            `;
            actionEl.title = "Block user";
            actionEl.style.cursor = "pointer";

            // Simple click guard to avoid rapid double-block
            let blocking = false;
            actionEl.addEventListener("click", () => {
              if (blocking) return;
              blocking = true;
              fc_member_block_fnc(
                user.user_id,
                chat.chat_id,
                fc_user_public_key,
                fc_user_secret_key
              );
              setTimeout(() => { blocking = false; }, 800);
            });
          } else {
            actionEl = fc_el_fnc(
              "div",
              `fc-profile-value-${widgetId}`,
              { text: "Participant" }
            );
          }

          row.append(userWrap, actionEl);
          rightCol.appendChild(row);
        }

        // ASSEMBLE & SHOW DIALOG
        container.append(leftCol, rightCol);
        fragment.appendChild(container);

        fc_dialog_fnc(
          fc_chat_id,
          "Conversation Participants",
          fragment
        );
      }
    );
  } finally {
    // RELEASE LOCK
    setTimeout(() => {
      window[lockKey] = false;
    }, 1000);
  }
}

async function fc_edit_profile_fnc(fc_user_public_key, fc_user_secret_key) {
  if (!fc_cfg?.widget_id || !fc_user_id) return;

  const profile = fc_push_users?.[fc_user_id];
  if (!profile) return;

  const wid = fc_cfg.widget_id;
  const fragment = document.createDocumentFragment();

  /* =============================
     HELPERS
  ============================== */
  const createSelect = (id, optionsHTML, value) => {
    const sel = fc_el_fnc("select", `fc-select-${wid} fc-profile-value-${wid}`);
    sel.id = id;
    sel.innerHTML = optionsHTML;
    sel.value = value ?? "";
    return sel;
  };

  /* =============================
     CONTAINER
  ============================== */
  const container = fc_el_fnc("div", `fc-profile-container-${wid}`);

  /* =============================
     LEFT COLUMN
  ============================== */
  const leftCol = fc_el_fnc("div", `fc-profile-left-${wid}`);
  const avatarWrap = fc_el_fnc("div", `fc-avatar-wrap-${wid}`);

  const status = String(profile.status || "offline").toLowerCase();

  avatarWrap.append(
    fc_el_fnc("span", `fc-statusDot-${wid} fc-${status}-${wid}`),
    fc_el_fnc("img", `fc-${status}-${wid}`, {
      src: fc_dp_fnc(profile.gender),
      alt: "Profile picture",
      loading: "lazy"
    })
  );

  leftCol.appendChild(avatarWrap);

  /* Status selector */
  const statusRow = fc_el_fnc("div", `fc-profile-row-${wid}`);
  statusRow.append(
    fc_el_fnc("div", `fc-profile-label-${wid}`, { text: "Status" }),
    createSelect(
      `fc-pro-status-${wid}`,
      `
        <option value="online">Online</option>
        <option value="away">Away</option>
        <option value="busy">Busy</option>
        <option value="offline">Offline</option>
      `,
      status
    )
  );
  leftCol.appendChild(statusRow);

  /* =============================
     RIGHT COLUMN
  ============================== */
  const rightCol = fc_el_fnc("div", `fc-profile-right-${wid}`);

  const addRow = (label, inputEl) => {
    const row = fc_el_fnc("div", `fc-profile-row-${wid}`);
    row.append(
      fc_el_fnc("div", `fc-profile-label-${wid}`, { text: label }),
      inputEl
    );
    rightCol.appendChild(row);
  };

  /* Nickname */
  addRow(
    "Nickname",
    fc_el_fnc("input", `fc-input-${wid} fc-profile-value-${wid}`, {
      id: `fc-pro-nickname-${wid}`,
      type: "text",
      value: profile.nickname || "",
      maxLength: 32,
      placeholder: "Your Nickname"
    })
  );

  /* Gender */
  addRow(
    "Gender",
    createSelect(
      `fc-pro-gender-${wid}`,
      `
        <option value="male">Male</option>
        <option value="female">Female</option>
        <option value="not_specified">Not Specified</option>
      `,
      profile.gender
    )
  );

  /* Age options (cached once) */
  let ageOptions = "";
  for (let i = 18; i <= 63; i++) ageOptions += `<option value="${i}">${i}</option>`;

  addRow(
    "Age",
    createSelect(`fc-pro-age-${wid}`, ageOptions, String(profile.age || "").replace(/\D/g, ""))
  );

  addRow(
    "Looking For",
    createSelect(
      `fc-pro-findgender-${wid}`,
      `
        <option value="male">Male</option>
        <option value="female">Female</option>
        <option value="any">Any</option>
      `,
      profile.findgender
    )
  );

  addRow(
    "Age From",
    createSelect(`fc-pro-agefrom-${wid}`, ageOptions, String(profile.agefrom || "").replace(/\D/g, ""))
  );

  addRow(
    "Age To",
    createSelect(`fc-pro-ageto-${wid}`, ageOptions, String(profile.ageto || "").replace(/\D/g, ""))
  );

  /* =============================
     ACTIONS
  ============================== */
  const actionRow = fc_el_fnc("div", `fc-profile-action-${wid}`);
  const saveBtn = fc_el_fnc("button", `fc-accept-btn-${wid}`, { text: "Update" });
  saveBtn.type = "button";

  saveBtn.addEventListener("click", async () => {


    const fc_formEl = document.getElementById(`fc-dialog-overlay-${wid}-${fc_user_id}`);
  const fc_controls = fc_formEl
    ? Array.from(fc_formEl.querySelectorAll(":scope input, :scope button, :scope textarea, :scope select"))
    : [];

      // Per-chat double-submit guard
  const fc_lockKey = `fc_profile_lock_${wid}`;
  if (window[fc_lockKey]) return;
  window[fc_lockKey] = true;

  // Disable inputs
  fc_toggle_controls_fnc(fc_controls, true);

    const fc_data = {
      status: document.getElementById(`fc-pro-status-${wid}`)?.value,
      nickname: document.getElementById(`fc-pro-nickname-${wid}`)?.value.trim(),
      gender: document.getElementById(`fc-pro-gender-${wid}`)?.value,
      age: document.getElementById(`fc-pro-age-${wid}`)?.value,
      findgender: document.getElementById(`fc-pro-findgender-${wid}`)?.value,
      agefrom: document.getElementById(`fc-pro-agefrom-${wid}`)?.value,
      ageto: document.getElementById(`fc-pro-ageto-${wid}`)?.value
    };

    /* Validation (unchanged logic) */
    if (!fc_data.nickname) return alert("Nickname is required");
    if (fc_data.nickname.length > 32) return alert("Maximum 32 characters for nickname");

    if (fc_data.agefrom && fc_data.ageto && Number(fc_data.agefrom) > Number(fc_data.ageto)) {
      return alert("Age From cannot be greater than Age To");
    }

    try {
      await fc_realTime_fnc(
        "profile_update",
        fc_user_public_key,
        fc_user_secret_key,
        fc_user_id,
        fc_data,
        response => {
          if (response) {
            fc_alert_fnc("Profile updated", "success");
            dialogInstance.close();
          }
        }
      );
    } catch {
      alert("Profile update failed");
    } finally {
    // Always re-enable inputs and release per-chat lock    
    setTimeout(() => {
      fc_toggle_controls_fnc(fc_controls, false);
      window[fc_lockKey] = false;
    }, 1000);
  }
  });

  actionRow.appendChild(saveBtn);

  /* =============================
     FINAL ASSEMBLY
  ============================== */
  container.append(leftCol, rightCol, actionRow);
  fragment.appendChild(container);

  const dialogInstance = fc_dialog_fnc(fc_user_id, "Edit Profile", fragment);
}


function fc_view_profile_fnc(fc_title = 'Profile', user_id, fc_isNearBy = false, fc_chatRequest = false, fc_user_public_key, fc_user_secret_key) {
  if (!fc_cfg || !fc_cfg.widget_id) return;
  const profile = fc_isNearBy ? fc_push_nearby?.[user_id] : fc_push_users?.[user_id];
  if (!profile) return;

  // Container
  const container = fc_el_fnc("div", `fc-profile-container-${fc_cfg.widget_id}`);

  // Left column
  const leftCol = fc_el_fnc("div", `fc-profile-left-${fc_cfg.widget_id}`);
  const avatarWrap = fc_el_fnc("div", `fc-avatar-wrap-${fc_cfg.widget_id}`);

  const statusSpan = fc_el_fnc(
    "span",
    `fc-statusDot-${fc_cfg.widget_id} fc-${String(profile.status).toLowerCase()}-${fc_cfg.widget_id}`
  );

  const img = fc_el_fnc(
    "img",
    ` fc-${String(profile.status).toLowerCase()}-${fc_cfg.widget_id}`,
    {
      src: fc_dp_fnc(profile.gender),
      alt: fc_safeText_fnc(profile.nickname || "Profile picture")
    }
  );

  avatarWrap.append(statusSpan, img);
  leftCol.appendChild(avatarWrap);

  const statusText = fc_el_fnc(
    "div",
    `fc-statusText-${fc_cfg.widget_id} fc-statusColor-${fc_cfg.widget_id} fc-${String(profile.status).toLowerCase()}-${fc_cfg.widget_id}`,
    { text: fc_safeText_fnc(profile.status || "-") }
  );
  leftCol.appendChild(statusText);

  // Right column
  const rightCol = fc_el_fnc("div", `fc-profile-right-${fc_cfg.widget_id}`);

  const addRow = (label, value, extraClass = `fc-profile-row-${fc_cfg.widget_id}`) => {
    const row = fc_el_fnc("div", extraClass);

    const labelEl = fc_el_fnc("div", `fc-profile-label-${fc_cfg.widget_id}`, {
      text: fc_safeText_fnc(label)
    });
    const valueEl = fc_el_fnc("div", `fc-profile-value-${fc_cfg.widget_id}`, {
      text: fc_safeText_fnc(value ?? "-")
    });

    row.append(labelEl, valueEl);
    rightCol.appendChild(row);
  };

  addRow("Nickname", profile.nickname);
  addRow("Gender", profile.gender?.toUpperCase());
  addRow("Age", profile.age);
  addRow("Last Seen", profile.last_seen);
  addRow("Distance", profile.distance);

  // Looking For section
  const lookingFor = fc_el_fnc(
    "div",
    `fc-profile-row-${fc_cfg.widget_id} fc-looking-${fc_cfg.widget_id}`,
    { text: "Looking For" }
  );
  rightCol.appendChild(lookingFor);

  addRow("Gender", profile.findgender?.toUpperCase());
  addRow("Age Range", `${profile.agefrom ?? "-"} to ${profile.ageto ?? "-"}`);

  // Assemble
  container.append(leftCol, rightCol);

  // Instead of frag, pass container directly
  const dialogInstance = fc_dialog_fnc(user_id, fc_title, container);

  // If chat request, add bottom button
  if (fc_chatRequest) {
    const actionWrap = fc_el_fnc("div", `fc-profile-action-${fc_cfg.widget_id}`);
    const acceptBtn = fc_el_fnc("button", `fc-accept-btn-${fc_cfg.widget_id}`, {
      text: "Accept",
      type: "button"
    });

    acceptBtn.onclick = async () => {

  try {
    const response = await fc_chat_accept_fnc(
      profile.user_id,
      fc_user_public_key,
      fc_user_secret_key
    );

    if (response === true) {
      // Only close if the function returned true
      dialogInstance.close();
    } 
  } catch (err) {
    
  }
};


    actionWrap.appendChild(acceptBtn);
    container.appendChild(actionWrap);
  }
}


function fc_dialog_fnc(fc_dialogId, title = "Welcome", content = "Thank you for visiting our website!") {
  if (!fc_cfg || !fc_cfg.widget_id) return;

  const overlayId = `fc-dialog-overlay-${fc_cfg.widget_id}-${fc_dialogId}`;

    const existingOverlay = document.getElementById(overlayId);;
  if (existingOverlay) return;

  const currentTitle = document.title;
  let toggle = false;
  const dialogInterval = setInterval(() => {
    document.title = toggle ? currentTitle : title;
    toggle = !toggle;
  }, 1000);

  
  const overlay = fc_el_fnc("div", `fc-dialog-overlay-${fc_cfg.widget_id}`, { id: overlayId });
  const dialogBox = fc_el_fnc("div", `fc-dialog-box-${fc_cfg.widget_id}`);
  dialogBox.setAttribute("role", "dialog");
  dialogBox.setAttribute("aria-modal", "true");

  const header = fc_el_fnc("div", `fc-dialog-header-${fc_cfg.widget_id}`);
  const titleEl = fc_el_fnc("span", "", { text: title });
  titleEl.id = `fc-dialog-title-${fc_cfg.widget_id}`;
  const closeBtn = fc_el_fnc("button", `fc-dialog-close-${fc_cfg.widget_id}`, { text: "×", type: "button" });

  closeBtn.onclick = () => closeDialog();

  header.appendChild(titleEl);
  header.appendChild(closeBtn);

  const body = fc_el_fnc("div", `fc-dialog-body-${fc_cfg.widget_id}`);
  if (content instanceof Node) {
    body.appendChild(content);
  } else {
    const h6 = fc_el_fnc("h6", "", { text: content });
    body.appendChild(h6);
  }

  dialogBox.appendChild(header);
  dialogBox.appendChild(body);
  overlay.appendChild(dialogBox);

  document.body.appendChild(overlay);

  overlay.addEventListener("click", e => {
    if (e.target === overlay) closeDialog();
  });

  function escHandler(e) {
    if (e.key === "Escape") closeDialog();
  }
  document.addEventListener("keydown", escHandler);

  function closeDialog() {
    clearInterval(dialogInterval);
    document.title = currentTitle;
    document.removeEventListener("keydown", escHandler);
    overlay.remove();
  }

  closeBtn.focus();
  return { close: closeDialog, overlay };
}


async function fc_send_text_message_fnc(fc_chat_id, fc_user_public_key, fc_user_secret_key) {
  if (!fc_cfg || !fc_cfg.widget_id) return;

  const fc_inputEl = document.getElementById(`fc-text-input-${fc_chat_id}`);
  if (!fc_inputEl) return;

  // Normalize and validate message
  let fc_text_message = fc_inputEl.value.trim();
  if (!fc_text_message) return;

  const fc_formEl = document.getElementById(`fc-input-${fc_chat_id}`);
  const fc_controls = fc_formEl
    ? Array.from(fc_formEl.querySelectorAll(":scope input, :scope button, :scope textarea, :scope select"))
    : [];

  // Per-chat double-submit guard
  const fc_lockKey = `fc_send_lock_${fc_chat_id}`;
  if (window[fc_lockKey]) return;
  window[fc_lockKey] = true;

  // Disable inputs
  fc_toggle_controls_fnc(fc_controls, true);

  try {
    await fc_realTime_fnc(
      "send_text",
      fc_user_public_key,
      fc_user_secret_key,
      fc_chat_id,
      fc_text_message,
      async function (response) {
        if (!response) return;

        // Clear input on success
        fc_inputEl.value = "";

        const fc_newMessageId = Number(response.data) || 0;
        if (fc_newMessageId > 0) {
          // Optimistic display
          const fc_message = {
            message_id: fc_newMessageId,
            chat_id: fc_chat_id,
            user_id: fc_user_id, // must be globally available
            message_type: "text",
            message_content: fc_text_message
          };

          fc_display_message_fnc(fc_message, "send_text", null, fc_user_public_key, fc_user_secret_key);

          window.fc_priorityLock = false; // release lock before streaming

          // Pull latest state; fc_realTime_fnc owns the priority lock and will pause/resume SSE safely
          await fc_realTime_fnc("stream", fc_user_public_key, fc_user_secret_key);
        }
      }
    );
  } finally {
    // Always re-enable inputs and release per-chat lock    
    setTimeout(() => {
      fc_toggle_controls_fnc(fc_controls, false);
    if (fc_inputEl) fc_inputEl.focus();
      window[fc_lockKey] = false;
    }, 1000);
  }
}




function fc_send_file_fnc(fc_chat_id, fc_user_public_key, fc_user_secret_key) {
  if (!fc_cfg || !fc_cfg.widget_id) return;
  const fc_fileInput = document.getElementById(`fc-file-${fc_chat_id}`);
  if (!fc_fileInput) return;

  // Trigger the file picker
  fc_fileInput.click();

  const onChangeHandler = async function (e) {
    e.preventDefault();

    const fc_inputEl = document.getElementById(`fc-text-input-${fc_chat_id}`);
    const fc_formEl = document.getElementById(`fc-input-${fc_chat_id}`);
    const fc_controls = fc_formEl
      ? Array.from(fc_formEl.querySelectorAll(":scope input, :scope button, :scope textarea, :scope select"))
      : [];

    // Exit if no file selected
    if (!fc_fileInput.files || fc_fileInput.files.length === 0) {
      fc_toggle_controls_fnc(fc_controls, false);
      fc_fileInput.removeEventListener("change", onChangeHandler);
      return;
    }

    const fc_file = fc_fileInput.files[0];
    if (!fc_file) {
      fc_toggle_controls_fnc(fc_controls, false);
      fc_fileInput.removeEventListener("change", onChangeHandler);
      return;
    }

    // Validate MIME type
    const allowedTypes = ["image/png", "image/gif", "image/jpeg"];
    if (!allowedTypes.includes(fc_file.type)) {
      alert("Only PNG, GIF, or JPEG images are allowed.");
      fc_toggle_controls_fnc(fc_controls, false);
      fc_fileInput.value = ""; // reset input
      fc_fileInput.removeEventListener("change", onChangeHandler);
      return;
    }


    const fc_formData = new FormData();
    fc_formData.append("id", fc_chat_id);
    fc_formData.append("do", "send_file");
    // 👇 must match backend expectation
    fc_formData.append("data", fc_fileInput.files[0]);

    // Per-chat double-submit guard
    const fc_lockKey = `fc_send_lock_${fc_chat_id}`;
    if (window[fc_lockKey]) return;
    window[fc_lockKey] = true;

    fc_toggle_controls_fnc(fc_controls, true);
    
    try {
      fc_realTime_fnc(
        "send_file",
        fc_user_public_key,
        fc_user_secret_key,
        fc_chat_id,
        fc_formData,
        async function (response) {
          if (!response) return;

          const fc_blobUrl = URL.createObjectURL(fc_fileInput.files[0]);

          const fc_newMessageId = Number(response.data) || 0;
          if (fc_newMessageId > 0) {
            const fc_message = {
              message_id: fc_newMessageId,
              chat_id: fc_chat_id,
              user_id: fc_user_id, // must be globally available
              message_type: "file",
              message_content: fc_blobUrl,
              local: true
            };

            fc_display_message_fnc(fc_message, "send_file", null, fc_user_public_key, fc_user_secret_key);

            // Let fc_realTime_fnc manage the lock itself
            await fc_realTime_fnc("stream", fc_user_public_key, fc_user_secret_key);
          }

          fc_toggle_controls_fnc(fc_controls, false);
          fc_fileInput.removeEventListener("change", onChangeHandler);
        }
      );
    } finally {
      setTimeout(() => {
        fc_toggle_controls_fnc(fc_controls, false);
      if (fc_inputEl) fc_inputEl.focus();
      window[fc_lockKey] = false;
    }, 1000);
    }
  };

  fc_fileInput.addEventListener("change", onChangeHandler);
}



function fc_alert_fnc(fc_message, fc_type = 'info') {
  if (!fc_cfg || !fc_cfg.widget_id) return;

  const fc_widgetId = fc_cfg.widget_id;
  const fc_window = document.getElementById(`fc-messenger-window-${fc_widgetId}`);
  if (!fc_window) return;

  // Create alert container if it doesn't exist
  let fc_alert_container = fc_window.querySelector(`.fc-alert-container-${fc_widgetId}`);
  if (!fc_alert_container) {
    fc_alert_container = document.createElement('div');
    fc_alert_container.className = `fc-alert-container-${fc_widgetId}`;
    Object.assign(fc_alert_container.style, {
      position: 'absolute',
      bottom: '10px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: '1000',
      width: '90%',
      maxWidth: '400px',
      pointerEvents: 'none' // let alerts not block clicks
    });
    fc_window.appendChild(fc_alert_container);
  }

  // Alert colors
  const fc_colors = {
    info: '#3498db',
    success: '#2ecc71',
    warning: '#f39c12',
    danger: '#e74c3c'
  };

  // Create alert element
  const fc_alert = document.createElement('div');
  fc_alert.className = `fc-alert-${fc_widgetId}`;
  Object.assign(fc_alert.style, {
    background: fc_colors[fc_type] || fc_colors.info,
    color: '#fff',
    padding: '10px 14px',
    marginTop: '6px',
    borderRadius: '6px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
    fontFamily: 'Arial, sans-serif',
    fontSize: '13px',
    lineHeight: '1.4',
    cursor: 'pointer',
    textAlign: 'center',
    pointerEvents: 'auto' // enable click for this alert
  });
  fc_alert.textContent = fc_message;

  // Remove alert on click or after timeout
  const removeAlert = () => fc_alert_container?.removeChild(fc_alert);
  fc_alert.addEventListener('click', removeAlert);
  setTimeout(removeAlert, 5000);

  fc_alert_container.appendChild(fc_alert);
}


function fc_dp_fnc(var_type) {

  // Map lowercase keys to filenames
  const dpMap = {
    male: "male.jpg",
    female: "female.jpg",
    room: "room.jpg",
    "not specified": "any.jpg"
  };

  // Normalize input to lowercase
  const key = (var_type || "").toLowerCase();

  // Return full URL, defaulting to any.jpg
  return fc_cdn_url + 'public/images/frontend/mint/' + (dpMap[key] || "any.jpg");
}




function fc_wrap_room_fnc(fc_room, fc_user_public_key, fc_user_secret_key) {
  if (!fc_room || !fc_cfg || !fc_cfg.widget_id) return;

  let fc_win_icon = '';

  const joined = Number(fc_room.joined);
  const blocked = Number(fc_room.blocked);
  const admin = Number(fc_room.admin);

  // Case 1: Not joined and not blocked → show join icon
  if (joined === 0 && blocked === 0) {
    fc_win_icon = `
      <a href="javascript:void(0)" 
         onclick="fc_join_room_fnc('${fc_room.room_id}', '${fc_user_public_key}', '${fc_user_secret_key}')" 
         title="Join Room">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 512 512" fill="currentColor" style="vertical-align:middle;">
          <path d="M201 95L345 239c9.4 9.4 9.4 24.6 0 33.9L201 417c-6.9 6.9-17.2 8.9-26.2 5.2S160 409.7 160 400v-64H48c-26.5 0-48-21.5-48-48v-64c0-26.5 21.5-48 48-48h112V112c0-9.7 5.8-18.5 14.8-22.2S194.1 88.2 201 95zm7 217v30.1l86.1-86.1-86.1-86.1v30.1c0 13.3-10.7 24-24 24H48v64h136c6.4 0 12.5 2.5 17 7s7 10.6 7 17zM344 432h72c26.5 0 48-21.5 48-48V128c0-26.5-21.5-48-48-48h-72c-13.3 0-24-10.7-24-24s10.7-24 24-24h72c53 0 96 43 96 96v256c0 53-43 96-96 96h-72c-13.3 0-24-10.7-24-24s10.7-24 24-24z"/>
        </svg>
      </a>`;
  }
  // Case 2: Joined and admin → show crown icon
  else if (joined === 1 && admin === 1) {
    fc_win_icon = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 640 640" fill="currentColor" style="vertical-align:middle;">
        <path d="M345 151.2C354.2 143.9 360 132.6 360 120C360 97.9 342.1 80 320 80C297.9 80 280 97.9 280 120C280 132.6 285.9 143.9 295 151.2L226.6 258.8C216.6 274.5 195.3 278.4 180.4 267.2L120.9 222.7C125.4 216.3 128 208.4 128 200C128 177.9 110.1 160 88 160C65.9 160 48 177.9 48 200C48 221.8 65.5 239.6 87.2 240L119.8 457.5C124.5 488.8 151.4 512 183.1 512H456.9C488.6 512 515.5 488.8 520.2 457.5L552.8 240C574.5 239.6 592 221.8 592 200C592 177.9 574.1 160 552 160C529.9 160 512 177.9 512 200C512 208.4 514.6 216.3 519.1 222.7L459.7 267.3C444.8 278.5 423.5 274.6 413.5 258.9L345 151.2z"/>
      </svg>`;
  }

  // Create room list item
  const li = fc_el_fnc("li", `fc-room-${fc_cfg.widget_id}`);
  li.id = `fc-room-${fc_room.room_id}`;

  const wrap = fc_el_fnc("div", `fc-wrap-${fc_cfg.widget_id}`);
  const img = fc_el_fnc("img");
  img.src = fc_dp_fnc("room");

  const meta = fc_el_fnc("div", `fc-meta-${fc_cfg.widget_id}`);
  meta.append(
    fc_el_fnc("p", `fc-name-${fc_cfg.widget_id}`, { text: fc_safeText_fnc(fc_room.title) }),
    fc_el_fnc("p", `fc-preview-${fc_cfg.widget_id}`, { text: fc_safeText_fnc(fc_room.total_users) })
  );

  const action = fc_el_fnc("div", `fc-action-${fc_cfg.widget_id}`);
  action.id = `fc-join-room-${fc_room.room_id}`;
  action.innerHTML = fc_win_icon;

  wrap.append(img, meta, action);
  li.appendChild(wrap);

  const area = fc_qs_fnc(`#fc-rooms-${fc_cfg.widget_id}`);
  if (area) area.appendChild(li);
}



async function fc_join_room_fnc(fc_room_id, fc_user_public_key, fc_user_secret_key) {
  if (!fc_cfg?.widget_id) return;

  const fc_roomEl = document.getElementById(`fc-room-${fc_room_id}`);
  const fc_joinRoomEl = document.getElementById(`fc-join-room-${fc_room_id}`);
  const fc_room = fc_push_rooms?.[fc_room_id];
  if (!fc_roomEl || !fc_joinRoomEl || !fc_room) return;

  // Per-user double-submit guard
  const fc_lockKey = `fc_room_lock_${fc_room_id}`;
  if (window[fc_lockKey]) return;
  window[fc_lockKey] = true;

  try {
    const response = await fc_realTime_fnc(
      "join_room",
      fc_user_public_key,
      fc_user_secret_key,
      fc_room_id,
      "",
      function (res) {
        if (!res) return;

        fc_removeElement_fnc(fc_joinRoomEl, 300);

        fc_alert_fnc(`Joined ${fc_room.title}`, "success");
      }
    );

    return response;

  } finally {
    // Release lock after 1s
    setTimeout(() => {
      window[fc_lockKey] = false;
    }, 1000);
  }
}




function fc_nearbyIcon_fnc(var_user, fc_user_public_key, fc_user_secret_key) {
  if (!var_user) return '';

  const joined = Number(var_user.chat_request) === 0;

  // Icon templates
  const icons = {
    ask: `
      <a href="javascript:void(0)" 
         onclick="fc_send_chat_request_fnc(${var_user.user_id}, '${fc_user_public_key}', '${fc_user_secret_key}')" 
         title="Ask for Chat" 
         data-bs-toggle="tooltip">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 640 640" fill="currentColor" style="vertical-align:middle;">
          <path d="M536.4-26.3c9.8-3.5 20.6-1 28 6.3s9.8 18.2 6.3 28l-178 496.9c-5 13.9-18.1 23.1-32.8 23.1-14.2 0-27-8.6-32.3-21.7l-64.2-158c-4.5-11-2.5-23.6 5.2-32.6l94.5-112.4c5.1-6.1 4.7-15-.9-20.6s-14.6-6-20.6-.9L229.2 276.1c-9.1 7.6-21.6 9.6-32.6 5.2L38.1 216.8c-13.1-5.3-21.7-18.1-21.7-32.3 0-14.7 9.2-27.8 23.1-32.8l496.9-178z"/>
        </svg>
      </a>`,
    accepted: `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 640 640" fill="currentColor" style="vertical-align:middle;">
        <path d="M32 0C14.3 0 0 14.3 0 32S14.3 64 32 64l0 11c0 42.4 16.9 83.1 46.9 113.1l67.9 67.9-67.9 67.9C48.9 353.9 32 394.6 32 437l0 11c-17.7 0-32 14.3-32 32s14.3 32 32 32l320 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l0-11c0-42.4-16.9-83.1-46.9-113.1l-67.9-67.9 67.9-67.9c30-30 46.9-70.7 46.9-113.1l0-11c17.7 0 32-14.3 32-32S369.7 0 352 0L32 0zM96 75l0-11 192 0 0 11c0 19-5.6 37.4-16 53L112 128c-10.3-15.6-16-34-16-53zm16 309c3.5-5.3 7.6-10.3 12.1-14.9l67.9-67.9 67.9 67.9c4.6 4.6 8.6 9.6 12.2 14.9L112 384z"/>
      </svg>`
  };

  return joined ? icons.ask : icons.accepted;
}


async function fc_send_chat_request_fnc(fc_user_id, fc_user_public_key, fc_user_secret_key) {
  if (!fc_cfg?.widget_id) return;

  const fc_nearbyUserEl = document.getElementById(`fc-nearby-user-${fc_user_id}`);
  const fc_chatRequestEl = document.getElementById(`fc-chat-request-${fc_user_id}`);
  if (!fc_nearbyUserEl || !fc_chatRequestEl) return;

  // Show "sending" state
  fc_chatRequestEl.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" 
         viewBox="0 0 640 640" fill="currentColor" style="vertical-align:middle;">
      <path d="M32 0C14.3 0 0 14.3 0 32S14.3 64 32 64l0 11c0 42.4 16.9 83.1 46.9 113.1l67.9 67.9-67.9 67.9C48.9 353.9 32 394.6 32 437l0 11c-17.7 0-32 14.3-32 32s14.3 32 32 32l320 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l0-11c0-42.4-16.9-83.1-46.9-113.1l-67.9-67.9 67.9-67.9c30-30 46.9-70.7 46.9-113.1l0-11c17.7 0 32-14.3 32-32S369.7 0 352 0L32 0zM96 75l0-11 192 0 0 11c0 19-5.6 37.4-16 53L112 128c-10.3-15.6-16-34-16-53zm16 309c3.5-5.3 7.6-10.3 12.1-14.9l67.9-67.9 67.9 67.9c4.6 4.6 8.6 9.6 12.2 14.9L112 384z"/>
    </svg>
  `;

  // Per-user double-submit guard
  const fc_lockKey = `fc_nearby_user_lock_${fc_user_id}`;
  if (window[fc_lockKey]) return;
  window[fc_lockKey] = true;

  try {
    const response = await fc_realTime_fnc(
      "chat_request",
      fc_user_public_key,
      fc_user_secret_key,
      fc_user_id,
      "",
      function (res) {
        if (!res) return;

        // Smooth fade-out of nearby user
        if (fc_nearbyUserEl) {
          fc_removeElement_fnc(fc_nearbyUserEl, 300);
        }
        fc_alert_fnc("Chat request sent!", "success");
      }
    );

    return response;

  } finally {
    // Release lock after 1s
    setTimeout(() => {
      window[fc_lockKey] = false;
    }, 1000);
  }
}


function fc_wrap_nearby_fnc(user, frag, fc_user_public_key, fc_user_secret_key) {
    if (!user || !fc_cfg?.widget_id) return;

    const wid = fc_cfg.widget_id;

    // List item
    const li = fc_el_fnc("li", `fc-nearby-${wid}`);
    li.id = `fc-nearby-user-${user.user_id}`;

    // Status indicator
    const statusSpan = fc_el_fnc("span", `fc-statusDot-${wid} fc-${String(user.status).toLowerCase()}-${wid}`);

    // Profile link
    const profileLink = fc_el_fnc("a");
    profileLink.href = "javascript:void(0)";
    profileLink.onclick = () => fc_view_profile_fnc('Profile', user.user_id, true, false, fc_user_public_key, fc_user_secret_key);

    // Avatar
    const img = fc_el_fnc("img", `fc-${String(user.status).toLowerCase()}-${wid}`, {
        src: fc_dp_fnc(user.gender),
        alt: fc_safeText_fnc(user.nickname),
    });
    profileLink.appendChild(img);

    // Meta (name + distance)
    const metaDiv = fc_el_fnc("div", `fc-meta-${wid}`);
    const nameP = fc_el_fnc("p", `fc-name-${wid}`, { text: fc_safeText_fnc(user.nickname) });
    const previewP = fc_el_fnc("p", `fc-preview-${wid}`, { text: fc_safeText_fnc(user.distance) });
    metaDiv.append(nameP, previewP);

    // Action (chat request button)
    const actionDiv = fc_el_fnc("div", `fc-action-${wid}`);
    actionDiv.id = `fc-chat-request-${user.user_id}`;
    actionDiv.innerHTML = fc_nearbyIcon_fnc(user, fc_user_public_key, fc_user_secret_key);

    // Wrap all
    const wrapDiv = fc_el_fnc("div", `fc-wrap-${wid}`);
    wrapDiv.append(statusSpan, profileLink, metaDiv, actionDiv);
    li.appendChild(wrapDiv);

    // Append to fragment if passed, otherwise prepend to container
    if (frag) frag.appendChild(li);
    else {
        const container = fc_qs_fnc(`#fc-nearby-${wid}`);
        if (container) container.prepend(li);
    }
}




// Safe check: is a plain non-empty object
function fc_isNonEmptyObject_fnc(obj) {
  return (
    obj !== null &&
    typeof obj === "object" &&
    !Array.isArray(obj) &&
    Object.keys(obj).length > 0
  );
}

// Check if an array is empty or not valid
function fc_isEmptyArray_fnc(arr) {
  if (typeof arr !== "undefined" && arr !== null) {
    return (arr || []).length === 0;
  }
  return true;
}


// Check if an element exists in the DOM
function fc_isElementExist_fnc(eleId) {
  if (typeof eleId !== "undefined" && eleId !== null) {
    const element = document.getElementById(eleId);
    return element !== null;
  }
  return false;
}

// Check if a string or array is non-empty
function fc_isEmpty_fnc(inputVal) {
   if (typeof inputVal === "string" || Array.isArray(inputVal)) {
    return inputVal.length === 0;
  }
  if (inputVal === null || inputVal === undefined) {
    return true;
  }
  return false;
}

// Escape HTML to prevent injection
function fc_escapeHtml_fnc(fc_str) {
  return String(fc_str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fc_chat_update_fnc(fc_chat, fc_recipient, fc_user_public_key, fc_user_secret_key) {
  if (!fc_chat || !fc_cfg?.widget_id) return;

  const widgetId = fc_cfg.widget_id;
  const chatId = fc_chat.chat_id;
  const chatEleId = `fc-chat-${chatId}`;

  // Avoid duplicate chat element
  if (fc_isElementExist_fnc(chatEleId)) return;

  let status, gender, preview, recipientId, name, fc_chat_type;

  if (Number(fc_chat.room_id) === 0) {
    // Individual user chat
    status = (fc_recipient?.status ?? "offline").toLowerCase();
    gender = fc_recipient?.gender ?? "Unknown";
    preview = fc_recipient?.distance ?? "";
    recipientId = fc_recipient?.user_id ?? "";
    name = fc_safeText_fnc(fc_recipient?.nickname ?? "Unknown");
    fc_chat_type = "user";
  } else {
    // Room chat
    status = "online";
    gender = "Room";
    preview = "Users: " + (fc_chat.total_participants ?? 0);
    recipientId = fc_chat.room_id;
    name = fc_safeText_fnc(fc_recipient?.title ?? "Room");
    fc_chat_type = "room";
  }

  const dpSrc = fc_dp_fnc(gender);

  // Create elements with helper functions
  const li = fc_el_fnc("li", `fc-chat-${widgetId}`);
  li.id = chatEleId;

  const wrap = fc_el_fnc("div", `fc-wrap-${widgetId} fc-link-${widgetId}`);
  wrap.setAttribute("onclick", `fc_start_chat_fnc('${chatId}', '${fc_chat_type}', '${fc_user_public_key}', '${fc_user_secret_key}', true)`);

  const statusSpan = fc_el_fnc("span", `fc-statusDot-${widgetId} fc-${status}-${widgetId}`);
  statusSpan.id = `fc-chat-status-${chatId}`;

  const img = fc_el_fnc("img", `fc-${status}-${widgetId}`, { src: dpSrc, alt: name });

  const meta = fc_el_fnc("div", `fc-meta-${widgetId}`);
  const nameP = fc_el_fnc("p", `fc-name-${widgetId}`, { text: name });
  const previewP = fc_el_fnc("p", `fc-preview-${widgetId}`, { text: preview });
  previewP.id = `fc-preview-${chatId}`;
  meta.append(nameP, previewP);

  const actionDiv = fc_el_fnc("div", `fc-action-${widgetId}`);
  actionDiv.id = `fc-chat-badge-${chatId}`;
  actionDiv.innerHTML = '';

  wrap.append(statusSpan, img, meta, actionDiv);
  li.appendChild(wrap);

  const listEl = fc_qs_fnc(`#fc-chats-${widgetId}`);
  if (listEl) listEl.prepend(li);

  // Remove old chat element for this recipient
  const oldChatEl = fc_qs_fnc(`#fc-chat-${recipientId}`);
  if (oldChatEl) oldChatEl.remove();
}



let fc_audioCache = {};

function fc_sound_fnc(fc_type = "notification", fc_zone = '') {
  if (!fc_base_url) return;

  if (window.fc_sound_muted) return;

  const soundMap = {
    message: "public/audios/message.mp3",
    initialize: "public/audios/initialize.mp3",
    notification: "public/audios/notification.mp3"
  };

  const fc_url = fc_cdn_url + (soundMap[fc_type] || soundMap.notification);

  // Zone check
  if (fc_zone) {
    const zoneEl = document.getElementById(fc_zone);
    if (zoneEl && zoneEl.contains(document.activeElement)) return;
  }


  try {
    if (!fc_audioCache[fc_type]) {
      fc_audioCache[fc_type] = new Audio(fc_url);
    }
    const audio = fc_audioCache[fc_type];
    audio.currentTime = 0; // rewind
    audio.play().catch(err => {
      const resumeHandler = () => audio.play();
      document.addEventListener("click", resumeHandler, { once: true });
      document.addEventListener("keydown", resumeHandler, { once: true });
    });
  } catch (err) {
  }
}





// =======================
// Message Status Function
// =======================
function fc_message_status_fnc(fc_message, fc_retries = 0) {
  if (!fc_cfg || !fc_cfg.widget_id) return;
  if (!fc_message || !fc_message.message_id || !fc_message.chat_id) return;

  const statusEl = fc_qs_fnc(`#fc-message-status-${fc_message.message_id}`);

  if (!statusEl) {
    if (fc_retries < 5) {
      requestAnimationFrame(() => fc_message_status_fnc(fc_message, fc_retries + 1));
    } 
    return;
  }

  const isSender = fc_message.user_id === fc_user_id;

 const FC_ICONS = Object.freeze({
        sending: `
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 3.5a.5.5 0 0 1 .5.5v4l2.5 1.5a.5.5 0 0 1-.5.866l-3-1.8A.5.5 0 0 1 7.5 8V4a.5.5 0 0 1 .5-.5z"/>
            <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1" fill="none"/>
          </svg>
        `,
        sent: `
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
            <path d="M13.485 1.929a.75.75 0 0 1 0 1.06L6.06 10.414 2.515 6.87a.75.75 0 0 1 1.06-1.06l2.485 2.485 6.364-6.364a.75.75 0 0 1 1.06 0z"/>
          </svg>
        `,
        delivered: `
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
            <path d="M6.354 10.354a.5.5 0 0 1-.708 0L2.5 7.207l.707-.707L6 9.293l6.793-6.793.707.707-7.146 7.147z"/>
            <path d="M12.354 10.354a.5.5 0 0 1-.708 0L8.5 7.207l.707-.707L12 9.293l2.793-2.793.707.707-3.146 3.147z"/>
          </svg>
        `,
         seen: `
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"> <path d="M2 2h12v12H2z" fill="none"/> <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 2a5 5 0 1 1 0 10A5 5 0 0 1 8 3z"/> </svg>
        `,
        info: `
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 2a5 5 0 1 1 0 10A5 5 0 0 1 8 3z"/>
            <path d="M7.002 11h2V7h-2v4zm0-6h2V3h-2v2z"/>
          </svg>
        `
    });

  statusEl.classList.remove(`fc-seen-${fc_cfg.widget_id}`);

  const fc_message_status = Number(fc_message.message_status);

  if (isSender) {
    switch (fc_message_status) {
      case 1: statusEl.innerHTML = FC_ICONS.sent; break;
      case 2: statusEl.innerHTML = FC_ICONS.delivered; break;
      case 3: statusEl.innerHTML = FC_ICONS.seen; statusEl.classList.add(`fc-seen-${fc_cfg.widget_id}`); break;
      default: statusEl.innerHTML = FC_ICONS.sending;
    }
  } else {
    statusEl.innerHTML = FC_ICONS.info;
  }


  const messagesEl = fc_qs_fnc(`#fc-messages-${fc_message.chat_id}`);
  if (messagesEl) {
    requestAnimationFrame(() => {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });

// Optional: double check after small delay if using images or async content
  setTimeout(() => {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }, 600);

  }
}

// =======================
// Display Message Function
// =======================
function fc_display_message_fnc(
  fc_message,
  fc_action,
  fc_fragment = null,
  fc_user_public_key,
  fc_user_secret_key
) {
  if (!fc_cfg?.widget_id) return;
  if (!fc_message?.message_id || !fc_message?.chat_id) return;

  const widgetId = fc_cfg.widget_id;
  const normalizedId = String(fc_message.message_id);
  const messageEleId = `fc-message-${normalizedId}`;

  const fragmentNode = fc_fragment || fc_fragment_fnc();

  // ===============================
  // DUPLICATE PROTECTION
  // ===============================
  if (
    fc_qs_fnc(`#${messageEleId}`) ||
    fragmentNode.querySelector(`#${messageEleId}`) ||
    (window.fc_rendered_messages && window.fc_rendered_messages.has(normalizedId))
  ) {
    if (fc_message.message_type !== "system") {
      fc_message_status_fnc(fc_message);
    }
    return;
  }

  if (!window.fc_rendered_messages) {
    window.fc_rendered_messages = new Set();
  }
  window.fc_rendered_messages.add(normalizedId);

  // ===============================
  // SYSTEM MESSAGE (CENTERED)
  // ===============================
  if (fc_message.message_type === "system") {
  const li = fc_el_fnc(
    "li",
    `fc-system-${widgetId}`,
    { id: messageEleId }
  );
  

  const p = fc_el_fnc(
    "p",
    `fc-system-text-${widgetId}`,
    {
      text: fc_safeText_fnc(fc_message.message_content || "")
    }
  );

  // Click → view profile (same logic)
  p.style.cursor = "pointer";
  p.addEventListener(
    "click",
    () => {
      fc_view_profile_fnc(
        "Profile",
        fc_message.user_id,
        false,
        false,
        fc_user_public_key,
        fc_user_secret_key
      );
    },
    { passive: true } // performance hint
  );

  li.appendChild(p);
  fragmentNode.appendChild(li);

  if (!fc_fragment) {
    const convEl = fc_qs_fnc(`#fc-conversation-${fc_message.chat_id}`);
    if (convEl) {
      requestAnimationFrame(() => {
        convEl.appendChild(fragmentNode);
        convEl.parentElement.scrollTop = convEl.parentElement.scrollHeight;
      });
    }
  }

  const previewEl = fc_qs_fnc(`#fc-preview-${fc_message.chat_id}`);
  if (previewEl) previewEl.innerHTML = fc_safeText_fnc(fc_message.message_content || "");

  // Same event trigger
  fc_on_new_message_arrived_fnc(fc_message.chat_id);
  return;
}


  // ===============================
  // NORMAL MESSAGE (SENT / REPLY)
  // ===============================
  const messageUser = fc_push_users?.[fc_message.user_id];
  if (!messageUser) return;

  const isReply = fc_message.user_id !== fc_user_id;
  const displayType = isReply ? "replies" : "sent";
  const statusClass = (messageUser.status || "offline").toLowerCase();

  // ---------- Message content ----------
  let messageContent = "";
  let messagePreview = "";

  if (fc_message.message_type === "text") {
    messageContent = fc_safeText_fnc(fc_message.message_content || "");
    messagePreview = messageContent;
  } else {
    const fileUrl = fc_message.local === true
      ? fc_message.message_content
      : `${fc_cdn_url}public/uploads/${fc_message.message_content}`;

    messageContent =
      `<img src="${fileUrl}"
            class="fc-lightbox-thumb-${widgetId}"
            data-full="${fileUrl}"
            loading="eager"
            alt="" />`;

    messagePreview =
      `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
         <path d="M14.002 3a2 2 0 0 0-2-2H4.002a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8.002a2 2 0 0 0 2-2V3z"/>
       </svg>`;
  }

  // ---------- DOM structure ----------
  const li = fc_el_fnc(
    "li",
    `user-${messageUser.user_id} fc-${displayType}-${widgetId}`,
    { id: messageEleId }
  );

  const nicknameSpan = fc_el_fnc(
    "span",
    `fc-nickname-${widgetId} fc-statusColor-${widgetId} fc-${statusClass}-${widgetId}`,
    { text: messageUser.nickname || "Unknown" }
  );

  const img = fc_el_fnc(
    "img",
    `fc-dp-${widgetId} fc-${statusClass}-${widgetId}`,
    {
      src: fc_dp_fnc(messageUser.gender || "unknown"),
      alt: "View Profile"
    }
  );

  img.style.cursor = "pointer";
  img.addEventListener("click", () => {
    fc_view_profile_fnc("Profile", messageUser.user_id, false, false, fc_user_public_key, fc_user_secret_key);
  });

  const p = fc_el_fnc("p");
  p.innerHTML = messageContent;

  const statusSpan = fc_el_fnc(
    "span",
    `fc-status-${widgetId}`,
    { id: `fc-message-status-${normalizedId}` }
  );

  li.append(nicknameSpan, img, p, statusSpan);
  fragmentNode.appendChild(li);

  // ===============================
  // APPEND TO DOM
  // ===============================
  if (!fc_fragment) {
    const convEl = fc_qs_fnc(`#fc-conversation-${fc_message.chat_id}`);
    if (convEl) {
      requestAnimationFrame(() => {
        convEl.appendChild(fragmentNode);
        convEl.parentElement.scrollTop = convEl.parentElement.scrollHeight;
      });

      setTimeout(() => {
        convEl.parentElement.scrollTop = convEl.parentElement.scrollHeight;
      }, 600);
    }
  }

  // ===============================
  // EVENTS & STATUS
  // ===============================
  if (isReply && fc_action === "stream") {
    fc_on_new_message_arrived_fnc(fc_message.chat_id);
    fc_sound_fnc("message", `fc-chat-win-${fc_message.chat_id}`);
  }

  if (isReply && Number(fc_message.message_status) !== 3) {
    fc_add_unseen_message_fnc(fc_message.chat_id, fc_message.message_id);
    fc_update_seen_badge_fnc(fc_message.chat_id);
  }

  const previewEl = fc_qs_fnc(`#fc-preview-${fc_message.chat_id}`);
  if (previewEl) previewEl.innerHTML = messagePreview;

  fc_message_status_fnc(fc_message);
}



document.addEventListener("click", function (e) {
  if (!fc_cfg || !fc_cfg.widget_id) return;

  const img = e.target.closest(`.fc-lightbox-thumb-${fc_cfg.widget_id}`);
  if (!img) return;

  if (document.querySelector(`.fc-lightbox-overlay-${fc_cfg.widget_id}`)) return;

  const src = img.dataset.full || img.src;
  if (!src) return;

  const overlay = document.createElement("div");
  overlay.className = `fc-lightbox-overlay-${fc_cfg.widget_id}`;
  overlay.innerHTML = `<img src="${src}" alt="">`;

  overlay.setAttribute("role", "dialog");
overlay.setAttribute("aria-modal", "true");
overlay.setAttribute("aria-label", "Image preview");

// Focus trap: move focus to overlay when opened
overlay.tabIndex = -1;
overlay.focus();


  overlay.addEventListener("click", () => {
    overlay.remove();
    document.body.style.overflow = "";
    img.focus();
  });

  const escHandler = (ev) => {
    if (ev.key === "Escape" || ev.key === "Enter" || ev.key === " ") {
      overlay.remove();
      document.body.style.overflow = "";
      img.focus();
      document.removeEventListener("keydown", escHandler);
    }
  };

  document.addEventListener("keydown", escHandler);

  document.body.appendChild(overlay);
  document.body.style.overflow = "hidden";
});


// Blink header on new message
function fc_blink_chat_header_fnc(fc_chat_id) {
  if (!fc_cfg || !fc_cfg.widget_id) return;

  const fc_win = fc_qs_fnc(`#fc-chat-win-${fc_chat_id}`);
  if (!fc_win) return;

  const fc_hdr = fc_qs_fnc(`.fc-chat-info-${fc_cfg.widget_id}`, fc_win);
  if (!fc_hdr) return;

  // Check if input is focused inside this chat window
  const fc_input = fc_qs_fnc("input, textarea", fc_win);
  if (fc_input && document.activeElement === fc_input) return; // already focused, don't blink

  // Add blinking class
  fc_hdr.classList.add(`fc-blink-${fc_cfg.widget_id}`);

  // Function to remove blinking
  const fc_stopBlink = () => fc_hdr.classList.remove(`fc-blink-${fc_cfg.widget_id}`);

  // Stop blinking on header click
  fc_hdr.addEventListener("click", fc_stopBlink, { once: true });

  // Stop blinking on interaction inside chat window
  const fc_interactHandler = (e) => {
    // If user focuses input or clicks inside window
    if (e.target.closest(`#fc-chat-win-${fc_chat_id}`)) {
      fc_stopBlink();
      fc_win.removeEventListener("click", fc_interactHandler);
      fc_win.removeEventListener("focusin", fc_interactHandler);
    }
  };

  fc_win.addEventListener("click", fc_interactHandler);
  fc_win.addEventListener("focusin", fc_interactHandler);
}

async function fc_send_tmp_fnc(fc_recordId, fc_recordType, fc_user_public_key, fc_user_secret_key, fc_chat_id = 0) {
  if (window.fc_priorityLock) return;
  if (!fc_cfg || !fc_cfg.widget_id) return;
  if (!fc_recordType || !fc_recordId) return;

  const tmpData = JSON.stringify({
    type: fc_recordType,
    id: fc_recordId,
    time: Math.floor(Date.now() / 1000)
  });

  const fc_lockKey = `fc_${fc_recordType}_lock_${fc_chat_id}_${fc_recordId}`;
  if (window[fc_lockKey]) return;
  window[fc_lockKey] = true;

  try {
    await fc_realTime_fnc("tmp", fc_user_public_key, fc_user_secret_key, fc_chat_id, tmpData, async function(response) {
      if (response && response.status) {
        if (fc_recordType === "read") {
          const fc_unseenSet = window.fc_unread_messages.get(fc_chat_id);
          if (fc_unseenSet) {
            fc_unseenSet.delete(fc_recordId);
            fc_update_seen_badge_fnc(fc_chat_id);
          }
        }
        if (fc_recordType === "seen") {
          const fc_unseenCount = Number(window.fc_unseen_notifications) || 0;
          window.fc_unseen_notifications = Math.max(fc_unseenCount - 1, 0);
          fc_countNotification_fnc(fc_user_public_key, fc_user_secret_key);
          const notif = document.getElementById(`fc-notification-${fc_recordId}`);
          if (notif) notif.classList.remove(`fc-unread-${fc_cfg.widget_id}`);
        }
      } else {
        setTimeout(() => {
          fc_send_tmp_fnc(fc_recordId, fc_recordType, fc_user_public_key, fc_user_secret_key, fc_chat_id);
        }, 2000);
      }
    });
  } catch (err) {
  } finally {
    setTimeout(() => { window[fc_lockKey] = false; }, 1000);
  }
}


document.addEventListener("visibilitychange", () => {
  //if (window.fc_unread_messages.size === 0) return;
  if (!document.hidden && window.fc_last_user_public && window.fc_last_user_secret) {
    window.fc_unread_messages.forEach((_, chatId) => {
      fc_try_auto_tmp_fnc(chatId, window.fc_last_user_public, window.fc_last_user_secret);
    });
  }
});


document.addEventListener("focusin", (event) => {
  if (window.fc_unread_messages.size === 0) return;
  const chatWin = event.target.closest("[id^='fc-chat-win-']");
  if (chatWin && window.fc_last_user_public && window.fc_last_user_secret) {
    const fc_chatId = chatWin.id.replace("fc-chat-win-", "");
    if (window.fc_unread_messages.has(fc_chatId)) {
      fc_try_auto_tmp_fnc(fc_chatId, window.fc_last_user_public, window.fc_last_user_secret);
    }
  }
});


function fc_try_auto_tmp_fnc(fc_chat_id, fc_user_public_key, fc_user_secret_key) {
  if (window.fc_unread_messages.size === 0) return;
  if (window.fc_priorityLock) return;
  if (!fc_cfg?.widget_id) return;
  if (!fc_chat_id || !window.fc_unread_messages.has(fc_chat_id)) return;
  if (!document.hasFocus()) return;

  const fc_unseenSet = window.fc_unread_messages.get(fc_chat_id);
  if (!fc_unseenSet || fc_unseenSet.size === 0) return;

  const chatWinEl = fc_qs_fnc(`#fc-chat-win-${fc_chat_id}`);
    if (!chatWinEl || !chatWinEl.contains(document.activeElement) || chatWinEl.classList.contains(`fc-hidden-${fc_cfg.widget_id}`)) return;

  // Process all unseen messages with staggered delay
  let delay = 0;
  for (const fc_messageId of fc_unseenSet) {
    const fc_lockKey = `fc_seen_lock_${fc_chat_id}_${fc_messageId}`;
    if (!window[fc_lockKey]) {
      delay += 500; // stagger each send by 500ms
      setTimeout(() => {
        fc_send_tmp_fnc(fc_messageId, "read", fc_user_public_key, fc_user_secret_key, fc_chat_id);
      }, delay);
    }
  }
}


function fc_add_unseen_message_fnc(fc_chat_id, fc_messageId) {
  if (!window.fc_unread_messages.has(fc_chat_id)) {
    window.fc_unread_messages.set(fc_chat_id, new Set());
  }
  window.fc_unread_messages.get(fc_chat_id).add(fc_messageId);
}


// New message handler
function fc_on_new_message_arrived_fnc(fc_chat_id) {
  if (!fc_cfg || !fc_cfg.widget_id) return;
  if (!fc_chat_id || !fc_cfg || !fc_cfg.widget_id) return;
  fc_blink_chat_header_fnc(fc_chat_id);
}

function fc_update_seen_badge_fnc(fc_chat_id) {
  if (!fc_cfg || !fc_cfg.widget_id) return;

  const fc_chats_badgeEl = fc_qs_fnc(`#fc-chats-badge-${fc_cfg.widget_id}`);
  const fc_chat_badgeEl = fc_qs_fnc(`#fc-chat-badge-${fc_chat_id}`);
  const fc_chatEl = fc_qs_fnc(`#fc-chat-${fc_chat_id}`);

  if (!fc_chats_badgeEl || !fc_chat_badgeEl || !fc_chatEl) return;

  // Per‑chat count
  const fc_chat_unseenSet = window.fc_unread_messages.get(fc_chat_id);
  const fc_chat_count = fc_chat_unseenSet ? fc_chat_unseenSet.size : 0;

  // Total count across all chats
  let fc_chats_count = 0;
  window.fc_unread_messages.forEach(set => {
    fc_chats_count += set.size;
  });

  // Update per‑chat badge
  if (fc_chat_count > 0) {
    fc_chat_badgeEl.textContent = fc_chat_count;
    fc_chat_badgeEl.classList.add(`fc-badge-${fc_cfg.widget_id}`);
    fc_chatEl.classList.add(`fc-unread-${fc_cfg.widget_id}`);
  } else {
    fc_chat_badgeEl.textContent = "";
    fc_chat_badgeEl.classList.remove(`fc-badge-${fc_cfg.widget_id}`);
    fc_chatEl.classList.remove(`fc-unread-${fc_cfg.widget_id}`);
  }

  // Update Chats tab badge
  if (fc_chats_count > 0) {
    fc_chats_badgeEl.textContent = fc_chats_count;
    fc_chats_badgeEl.classList.add(`fc-badge-${fc_cfg.widget_id}`);
  } else {
    fc_chats_badgeEl.textContent = "";
    fc_chats_badgeEl.classList.remove(`fc-badge-${fc_cfg.widget_id}`);
  }
}


// Global config/state (namespaced)
const fc_chat_state = {
  maxVisible: 3,
  openOrder: [],
  hiddenQueue: [],   // <-- add this back
  containersInitialized: false
};


// Create dock and "More" UI once
function fc_init_chat_dock_fnc(fc_chat_id) {
  if (!fc_cfg || !fc_cfg.widget_id) return;
  if (fc_chat_state.containersInitialized) return;

  // Use helper to create element safely
  const fc_dock = fc_el_fnc("div", `fc-chat-dock-${fc_cfg.widget_id}`, { id: `fc-chat-dock-${fc_cfg.widget_id}` });
  
  // Append to body
  document.body.appendChild(fc_dock);

  fc_chat_state.containersInitialized = true;
}


function fc_close_chat_fnc(fc_chat_id) {
  if (!fc_cfg || !fc_cfg.widget_id) return;
  const fc_win = fc_qs_fnc(`#fc-chat-win-${fc_chat_id}`);
  if (!fc_win) return;

  // Hide the chat window
  fc_win.classList.add(`fc-hidden-${fc_cfg.widget_id}`);

  // Remove from openOrder
  fc_chat_state.openOrder = fc_chat_state.openOrder.filter(id => id !== fc_chat_id);

  // Remove from hiddenQueue safely
  if (Array.isArray(fc_chat_state.hiddenQueue)) {
    fc_chat_state.hiddenQueue = fc_chat_state.hiddenQueue.filter(id => id !== fc_chat_id);
  }


  // Show next hidden chat if any
  const nextChatId = fc_chat_state.hiddenQueue?.shift();
  if (nextChatId && !fc_chat_state.openOrder.includes(nextChatId)) {
    fc_chat_state.openOrder.push(nextChatId);

    const nextWin = fc_qs_fnc(`#fc-chat-win-${nextChatId}`);
    if (nextWin) nextWin.classList.remove(`fc-hidden-${fc_cfg.widget_id}`);
  }
}



// Register a chat window in dock and manage visibility
function fc_register_chat_window_fnc(fc_chat_id) {
  if (!fc_cfg || !fc_cfg.widget_id) return;
  if (fc_chat_state.openOrder.includes(fc_chat_id)) return;

  // Evict oldest chat if exceeding max visible
  if (fc_chat_state.openOrder.length >= fc_chat_state.maxVisible) {
    const evictId = fc_chat_state.openOrder.shift();
    const evictWin = fc_qs_fnc(`#fc-chat-win-${evictId}`);
    if (evictWin) evictWin.classList.add(`fc-hidden-${fc_cfg.widget_id}`);

    // Add to hiddenQueue safely
    if (Array.isArray(fc_chat_state.hiddenQueue) && !fc_chat_state.hiddenQueue.includes(evictId)) {
      fc_chat_state.hiddenQueue.push(evictId);
    }
  }

  // Push new chat to openOrder
  fc_chat_state.openOrder.push(fc_chat_id);

  // Show the chat window
  const win = fc_qs_fnc(`#fc-chat-win-${fc_chat_id}`);
  if (win) win.classList.remove(`fc-hidden-${fc_cfg.widget_id}`);
}



// Move a chat to the rightmost (most recent) slot
function fc_focus_chat_window_fnc(fc_chat_id) {
  if (!fc_cfg || !fc_cfg.widget_id) return;
  // Remove from openOrder if already present
  fc_chat_state.openOrder = fc_chat_state.openOrder.filter(id => id !== fc_chat_id);

  // Evict oldest chat if maxVisible exceeded
  if (fc_chat_state.openOrder.length >= fc_chat_state.maxVisible) {
    const evictId = fc_chat_state.openOrder.shift();
    const evictWin = fc_qs_fnc(`#fc-chat-win-${evictId}`);
    if (evictWin) evictWin.classList.add(`fc-hidden-${fc_cfg.widget_id}`);

    // Track in hiddenQueue safely
    if (Array.isArray(fc_chat_state.hiddenQueue) && !fc_chat_state.hiddenQueue.includes(evictId)) {
      fc_chat_state.hiddenQueue.push(evictId);
    }
  }

  // Bring the focused chat to the front
  fc_chat_state.openOrder.push(fc_chat_id);

  // Ensure chat window is visible
  const win = fc_qs_fnc(`#fc-chat-win-${fc_chat_id}`);
  if (win) win.classList.remove(`fc-hidden-${fc_cfg.widget_id}`);
}


function fc_minimize_chat_fnc(fc_chat_id) {
  if (!fc_cfg || !fc_cfg.widget_id) return;
  const fc_win = fc_qs_fnc(`#fc-chat-win-${fc_chat_id}`);
  if (!fc_win) return; // safety check

  // Add minimized class
  fc_win.classList.add(`fc-minimized-${fc_cfg.widget_id}`);

  // List of button IDs to hide
  const buttonsToHide = [
    `fc-chatMinimize-${fc_chat_id}`,
    `fc-chatClose-${fc_chat_id}`,
    `fc-chatExit-${fc_chat_id}`,
    `fc-chatProfile-${fc_chat_id}`,
    `fc-chatRemove-${fc_chat_id}`,
    `fc-chatBlock-${fc_chat_id}`
  ];

  // Hide buttons safely
  buttonsToHide.forEach(id => {
    const btn = fc_qs_fnc(`#${id}`);
    if (btn) btn.style.display = "none";
  });

  // Hide extra icon buttons except maximize
  fc_qsa_fnc(`.fc-icon-btn-${fc_cfg.widget_id}`, fc_win).forEach(btn => {
    if (!btn.id.includes(`fc-chatMaximize-${fc_chat_id}`)) {
      btn.style.display = "none";
    }
  });

  // Show maximize button safely
  const maxBtn = fc_qs_fnc(`#fc-chatMaximize-${fc_chat_id}`);
  if (maxBtn) maxBtn.style.display = "inline-block";
}



function fc_maximize_chat_fnc(fc_chat_id) {
  if (!fc_cfg || !fc_cfg.widget_id) return;
  const fc_win = fc_qs_fnc(`#fc-chat-win-${fc_chat_id}`);
  if (!fc_win) return; // safety check

  // Remove minimized class
  fc_win.classList.remove(`fc-minimized-${fc_cfg.widget_id}`);

  // IDs of buttons to show
  const buttonsToShow = [
    `fc-chatMinimize-${fc_chat_id}`,
    `fc-chatClose-${fc_chat_id}`,
    `fc-chatExit-${fc_chat_id}`,
    `fc-chatProfile-${fc_chat_id}`,
    `fc-chatRemove-${fc_chat_id}`,
    `fc-chatBlock-${fc_chat_id}`
  ];

  // Show buttons safely
  buttonsToShow.forEach(id => {
    const btn = fc_qs_fnc(`#${id}`);
    if (btn) btn.style.display = "inline-block";
  });

  // Show extra icon buttons except maximize
  fc_qsa_fnc(`.fc-icon-btn-${fc_cfg.widget_id}`, fc_win).forEach(btn => {
    if (!btn.id.includes(`fc-chatMaximize-${fc_chat_id}`)) {
      btn.style.display = "inline-block";
    }
  });

  // Hide maximize button safely
  const maxBtn = fc_qs_fnc(`#fc-chatMaximize-${fc_chat_id}`);
  if (maxBtn) maxBtn.style.display = "none";
}


// Scroll helper (safe)
function fc_scroll_messages_bottom_fnc(fc_chat_id) {
  if (!fc_cfg || !fc_cfg.widget_id) return;

  const fc_messagesBox = fc_qs_fnc(`#fc-messages-${fc_chat_id}`);
  if (!fc_messagesBox) return;

  const fc_scrollToBottom = () => {
    fc_messagesBox.scrollTop = fc_messagesBox.scrollHeight;
  };

  // Immediate scroll
  requestAnimationFrame(fc_scrollToBottom);

  // Handle lazy images
  const fc_messagesImgs = fc_messagesBox.querySelectorAll("img");

  if (!fc_messagesImgs.length) return;

  let fc_pending = 0;

  fc_messagesImgs.forEach(fc_img => {
    if (!fc_img.complete) {
      fc_pending++;
      fc_img.addEventListener("load", () => {
        if (--fc_pending === 0) {
          requestAnimationFrame(fc_scrollToBottom);
        }
      }, { once: true });
    }
  });

  // Safety fallback (slow networks)
  if (fc_pending > 0) {
    setTimeout(fc_scrollToBottom, 600);
  }
}



function fc_start_chat_fnc(fc_chat_id, fc_chat_type, fc_user_public_key, fc_user_secret_key, fc_display = true) {
  if (!fc_cfg || !fc_cfg.widget_id) return;
    // Step 1: Ensure dock containers exist
    fc_init_chat_dock_fnc(fc_chat_id);

    // Step 2: Resolve window ID and check if it already exists
    const fc_chatWinId = `fc-chat-win-${fc_chat_id}`;
    let fc_existing = document.getElementById(fc_chatWinId);
    if (fc_existing) {
        if (fc_display) {
            fc_existing.classList.remove(`fc-hidden-${fc_cfg.widget_id}`);
            fc_register_chat_window_fnc(fc_chat_id);
            fc_focus_chat_window_fnc(fc_chat_id);
            fc_maximize_chat_fnc(fc_chat_id);
        } 
        fc_scroll_messages_bottom_fnc(fc_chat_id);
        return;
    }

    // Step 3: Validate chat exists in memory
    const fc_start_chat = fc_push_chats?.[fc_chat_id];
    if (!fc_start_chat || fc_isEmptyArray_fnc(fc_start_chat)) return;

    // Step 4: Resolve recipient
    const roomId = Number(fc_start_chat.room_id || 0);
    const startUserId = Number(fc_start_chat.user_id || 0);
    let fc_recipient = null;

    if (roomId === 0) {
        const fc_start_user_id = (startUserId === Number(fc_user_id)) ? fc_start_chat.recipient_id : fc_start_chat.user_id;
        fc_recipient = fc_push_users?.[fc_start_user_id] || null;
    } else {
        fc_recipient = fc_push_rooms?.[fc_start_chat.room_id] || null;
    }
    if (!fc_recipient || fc_isEmptyArray_fnc(fc_recipient)) return;

    // Step 5: Build chat window header info
    let fc_win_status, fc_win_gender, fc_win_preview, fc_win_name, fc_win_detail;

    if (roomId === 0) {
        fc_win_status = String(fc_recipient.status || "offline").toLowerCase();
        fc_win_gender = fc_recipient.gender || "unknown";
        fc_win_preview = fc_recipient.last_seen || "";
        fc_win_name = fc_safeText_fnc(fc_recipient.nickname || "Unknown");

        fc_win_detail =
            `<button id="fc-chatBlock-${fc_chat_id}" class="fc-icon-btn-${fc_cfg.widget_id}" title="Block User" onclick="fc_user_block_fnc('${fc_recipient.user_id}', '${fc_chat_id}', '${fc_user_public_key}', '${fc_user_secret_key}')"><svg width="12" height="12" viewBox="0 0 24 24"
         xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="3"/>
      <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
    </svg>
    </button>` +
            `<button id="fc-chatProfile-${fc_chat_id}" class="fc-icon-btn-${fc_cfg.widget_id}" title="View Profile" onclick="fc_view_profile_fnc('Profile', '${fc_recipient.user_id}', false, false, '${fc_user_public_key}', '${fc_user_secret_key}')"><svg class="profile-icon" xmlns="http://www.w3.org/2000/svg" 
         viewBox="0 0 448 512" width="12" height="12" fill="currentColor">
      <path d="M224 248a120 120 0 1 0 0-240 120 120 0 1 0 0 240zm-29.7 56C95.8 304 16 383.8 16 482.3 16 498.7 29.3 512 45.7 512l356.6 0c16.4 0 29.7-13.3 29.7-29.7 0-98.5-79.8-178.3-178.3-178.3l-59.4 0z"/>
    </svg>
    </button>`;
    } else {
        fc_win_status = "online";
        fc_win_gender = "Room";
        fc_win_preview = "Users: " + (fc_start_chat.total_participants ?? "");
        fc_win_name = fc_safeText_fnc(fc_recipient.title || "Room");

        fc_win_detail =
            `<button id="fc-chatExit-${fc_chat_id}" class="fc-icon-btn-${fc_cfg.widget_id}" title="Exit Room" onclick="fc_exit_room_fnc('${fc_chat_id}', '${fc_user_public_key}', '${fc_user_secret_key}')"><svg class="logout-icon" xmlns="http://www.w3.org/2000/svg" 
         viewBox="0 0 512 512" width="12" height="12" fill="currentColor">
      <path d="M505 273c9.4-9.4 9.4-24.6 0-33.9L361 95c-6.9-6.9-17.2-8.9-26.2-5.2S320 102.3 320 112l0 80-112 0c-26.5 0-48 21.5-48 48l0 32c0 26.5 21.5 48 48 48l112 0 0 80c0 9.7 5.8 18.5 14.8 22.2s19.3 1.7 26.2-5.2L505 273zM160 96c17.7 0 32-14.3 32-32s-14.3-32-32-32L96 32C43 32 0 75 0 128L0 384c0 53 43 96 96 96l64 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-64 0c-17.7 0-32-14.3-32-32l0-256c0-17.7 14.3-32 32-32l64 0z"/>
    </svg>
    </button>` +
            `<button id="fc-chatUsers-${fc_chat_id}" class="fc-icon-btn-${fc_cfg.widget_id}" title="View Users" onclick="fc_view_users_fnc('${fc_chat_id}', '${fc_user_public_key}', '${fc_user_secret_key}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"
     xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h7v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
</svg>
    </button>`;
    }

    // Step 6: Create chat window container using fragment for performance
    const fc_win = fc_el_fnc("div", `fc-chat-win-${fc_cfg.widget_id}`, { id: fc_chatWinId });

    // Hide window initially if fc_display is false
    if (!fc_display)fc_win.classList.add(`fc-hidden-${fc_cfg.widget_id}`);

    const frag = fc_fragment_fnc();

    // Inner HTML safely set
    fc_win.innerHTML =
        `<div class="fc-chat-info-${fc_cfg.widget_id}">
            <span class="fc-statusDot-${fc_cfg.widget_id} fc-${fc_win_status}-${fc_cfg.widget_id}"></span>
            <img class="fc-dp-${fc_cfg.widget_id} fc-${fc_win_status}-${fc_cfg.widget_id}" src="${fc_dp_fnc(fc_win_gender)}" alt="${fc_win_gender}" />
            <div class="fc-chat-title-${fc_cfg.widget_id}">
              <p class="fc-nickname-${fc_cfg.widget_id} fc-statusColor-${fc_cfg.widget_id} fc-${fc_win_status}-${fc_cfg.widget_id}">${fc_win_name}</p>
              <p class="fc-status-${fc_cfg.widget_id}">${fc_safeText_fnc(fc_win_preview)}</p>
            </div>
            <div class="fc-chat-icons-${fc_cfg.widget_id}">
              ${fc_win_detail}
              <button id="fc-chatRemove-${fc_chat_id}" class="fc-icon-btn-${fc_cfg.widget_id}" title="Remove Chat History" onclick="fc_delete_messages_fnc('${fc_chat_id}', '${fc_user_public_key}', '${fc_user_secret_key}')"><svg xmlns="http://www.w3.org/2000/svg" 
     width="12" height="12" 
     viewBox="0 0 576 512" 
     fill="currentColor">
  <path d="M41-25C31.6-34.3 16.4-34.3 7-25S-2.3-.4 7 9L535 537c9.4 9.4 24.6 9.4 33.9 0s9.4-24.6 0-33.9l-96.6-96.6c44.4-43.2 71.6-101.8 71.6-166.5 0-132.5-114.6-240-256-240-63 0-120.8 21.4-165.4 56.8L41-25zm19.4 155C42.2 163 32 200.3 32 239.9 32 294.2 51.2 344.2 83.6 384.4L34.8 476.7c-4.8 9-3.3 20 3.6 27.5S56.1 514 65.5 510l118.4-50.7c31.8 13.3 67.1 20.7 104.1 20.7 36.4 0 70.9-7.1 102.3-19.9L60.3 130.1z"/>
</svg>
    </button>
              <button id="fc-chatMinimize-${fc_chat_id}" class="fc-icon-btn-${fc_cfg.widget_id}" title="Minimize" onclick="fc_minimize_chat_fnc('${fc_chat_id}')"><svg class="minus-icon" xmlns="http://www.w3.org/2000/svg" 
         viewBox="0 0 512 512" width="12" height="12" fill="currentColor">
      <path d="M0 416c0-17.7 14.3-32 32-32l448 0c17.7 0 32 14.3 32 32s-14.3 32-32 32L32 448c-17.7 0-32-14.3-32-32z"/>
    </svg>
    </button>
              <button id="fc-chatMaximize-${fc_chat_id}" class="fc-icon-btn-${fc_cfg.widget_id}" title="Maximize" onclick="fc_maximize_chat_fnc('${fc_chat_id}')" style="display: none;"><svg class="expand-icon" xmlns="http://www.w3.org/2000/svg" 
         viewBox="0 0 448 512" width="12" height="12" fill="currentColor">
      <path d="M32 32C14.3 32 0 46.3 0 64l0 96c0 17.7 14.3 32 32 32s32-14.3 32-32l0-64 64 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L32 32zM64 352c0-17.7-14.3-32-32-32S0 334.3 0 352l0 96c0 17.7 14.3 32 32 32l96 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-64 0 0-64zM320 32c-17.7 0-32 14.3-32 32s14.3 32 32 32l64 0 0 64c0 17.7 14.3 32 32 32s32-14.3 32-32l0-96c0-17.7-14.3-32-32-32l-96 0zM448 352c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 64-64 0c-17.7 0-32 14.3-32 32s14.3 32 32 32l96 0c17.7 0 32-14.3 32-32l0-96z"/>
    </svg>
    </button>
              <button id="fc-chatClose-${fc_chat_id}" class="fc-icon-btn-${fc_cfg.widget_id}" title="Close" onclick="fc_close_chat_fnc('${fc_chat_id}')"><svg class="close-icon" xmlns="http://www.w3.org/2000/svg" 
         viewBox="0 0 384 512" width="12" height="12" fill="currentColor">
      <path d="M55.1 73.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L147.2 256 9.9 393.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192.5 301.3 329.9 438.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.8 256 375.1 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192.5 210.7 55.1 73.4z"/>
    </svg>
    </button>
            </div>
          </div>
          <div class="fc-messages-${fc_cfg.widget_id}" id="fc-messages-${fc_chat_id}">
            <ul id="fc-conversation-${fc_chat_id}"></ul>
          </div>
          <div class="fc-inputs-${fc_cfg.widget_id}" id="fc-input-${fc_chat_id}">
            <div class="fc-wrap-${fc_cfg.widget_id}">
              <input type="text" placeholder="Write your message..." name="fc-text-input-${fc_chat_id}" id="fc-text-input-${fc_chat_id}" />
              <form class="fc-file-form-${fc_cfg.widget_id}" name="file_frm_${fc_chat_id}" id="fc-file-frm-${fc_chat_id}" method="post" enctype="multipart/form-data">
                <input type="file" id="fc-file-${fc_chat_id}" name="file" accept="image/x-png,image/gif,image/jpeg" />
                <input type="hidden" id="fc-id-${fc_chat_id}" name="id" value="${fc_chat_id}">
                <input type="hidden" id="fc-do-${fc_chat_id}" name="do" value="send_file">
              </form>
              <button class="fc-attachment-${fc_cfg.widget_id}" onclick="fc_send_file_fnc('${fc_chat_id}', '${fc_user_public_key}', '${fc_user_secret_key}')" title="Send Image"><svg class="image-icon" xmlns="http://www.w3.org/2000/svg"
         width="14" height="14" viewBox="0 0 24 24" fill="none" 
         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <circle cx="8.5" cy="8.5" r="2"/>
        <path d="M21 21l-5-7-4 6-3-4-5 5"/>
    </svg>
    </button>
              <button class="fc-submit-${fc_cfg.widget_id}" onclick="fc_send_text_message_fnc('${fc_chat_id}', '${fc_user_public_key}', '${fc_user_secret_key}')" title="Send Message"><svg class="send-icon" xmlns="http://www.w3.org/2000/svg" 
         viewBox="0 0 576 512" width="14" height="14" fill="currentColor">
        <path d="M290.5 287.7L491.4 86.9 359 456.3 290.5 287.7zM457.4 53L256.6 253.8 88 185.3 457.4 53zM38.1 216.8l205.8 83.6 83.6 205.8c5.3 13.1 18.1 21.7 32.3 21.7 14.7 0 27.8-9.2 32.8-23.1L570.6 8c3.5-9.8 1-20.6-6.3-28s-18.2-9.8-28-6.3L39.4 151.7c-13.9 5-23.1 18.1-23.1 32.8 0 14.2 8.6 27 21.7 32.3z"/>
    </svg>
    </button>
            </div>
          </div>`;

    frag.appendChild(fc_win);

    // Step 7: Attach to dock
    const fc_dockEl = document.getElementById(`fc-chat-dock-${fc_widget_id}`);
    if (!fc_dockEl) return;
    fc_dockEl.appendChild(frag);

    // Step 8: Register/focus if visible
    if (fc_display) {
        fc_register_chat_window_fnc(fc_chat_id);
        fc_focus_chat_window_fnc(fc_chat_id);
    }

    // Step 9: Scroll messages to bottom
    fc_scroll_messages_bottom_fnc(fc_chat_id);

    const inputEl = document.getElementById(`fc-text-input-${fc_chat_id}`);
  if (!inputEl) return;

  inputEl.addEventListener("keydown", function (e) {
    // Check for Enter key without Shift (to allow multiline with Shift+Enter if desired)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // prevent newline
      fc_send_text_message_fnc(fc_chat_id, fc_user_public_key, fc_user_secret_key);
    }
  });

}




function fc_updateSelf_fnc(fc_self_info, fc_user_public_key) {
  if (!fc_self_info || !fc_cfg || !fc_user_public_key) return;

  const selfContainer = document.getElementById(`fc-self-info-${fc_user_public_key}`);
  if (!selfContainer) return;

  const widgetId = fc_cfg.widget_id;
  const statusClass = fc_self_info.status?.toLowerCase() || "";

  // Elements mapping
  const elements = {
    avatar: selfContainer.querySelector(`.fc-dp-${widgetId}`),
    nickname: selfContainer.querySelector(`.fc-nickname-${widgetId}`),
    statusText: selfContainer.querySelector(`.fc-status-${widgetId}`)
  };

  // Update avatar
  if (elements.avatar && fc_self_info.gender) {
    elements.avatar.src = fc_dp_fnc(fc_self_info.gender);
    elements.avatar.alt = fc_self_info.gender;
  }

  // Update text content safely
  if (elements.nickname && fc_self_info.nickname) {
    elements.nickname.textContent = fc_self_info.nickname;
  }
  if (elements.statusText && fc_self_info.status) {
    elements.statusText.textContent = fc_self_info.status;
  }

  // Update status classes
  const statusClassList = ["fc-online", "fc-away", "fc-busy", "fc-offline"].map(s => `${s}-${widgetId}`);
  [elements.avatar, elements.nickname].forEach(el => {
    if (!el) return;
    statusClassList.forEach(cls => el.classList.remove(cls));
    if (statusClass) el.classList.add(`fc-${statusClass}-${widgetId}`);
  });
}

async function fc_loadTab_fnc(fc_tabName, fc_user_public_key, fc_user_secret_key) {
  if (!fc_cfg || !fc_cfg.widget_id) return;

  const widgetId = fc_cfg.widget_id;

  // Remove active class from all tab contents
  const contents = document.querySelectorAll(`.fc-tabContent-${widgetId}`);
  contents.forEach(c => c.classList.remove(`fc-active-${widgetId}`));

  // Map tab names to their corresponding element IDs
  const tabMap = {
    chats: `fc-list-chats-${widgetId}`,
    nearby: `fc-list-nearby-${widgetId}`,
    rooms: `fc-list-rooms-${widgetId}`
  };

  const tabElId = tabMap[fc_tabName];
  if (!tabElId) return;

  const tabEl = document.getElementById(tabElId);
  if (tabEl) tabEl.classList.add(`fc-active-${widgetId}`);

  // Trigger real-time update only for "nearby"
  if (fc_tabName === "nearby") {
    await fc_realTime_fnc("nearby", fc_user_public_key, fc_user_secret_key);
  }
}