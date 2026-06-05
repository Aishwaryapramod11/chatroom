import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInAnonymously as firebaseSignInAnonymously,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  setDoc,
  doc, 
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';

// ---------------------------------------------------------
// Firebase Config & Initialization
// ---------------------------------------------------------
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const isConfigured = !!firebaseConfig.apiKey;

let app;
let db;
let auth;

if (isConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
  } catch (error) {
    console.error("Firebase SDK init failed, running in Mock mode:", error);
  }
}

// ---------------------------------------------------------
// Mock Data Store (Fallback using localStorage & BroadcastChannel)
// ---------------------------------------------------------
const mockChannel = typeof window !== 'undefined' ? new BroadcastChannel('chatsphere_mock_presence') : null;

const getLocalData = () => {
  const defaultData = {
    users: {},
    rooms: [
      { id: 'lobby', name: 'General Lobby', description: 'Main chat room for general discussion.', createdBy: 'system', createdAt: new Date().toISOString() },
      { id: 'tech', name: 'Technology & Code', description: 'Discuss React, Firebase, CSS, and modern web tech.', createdBy: 'system', createdAt: new Date().toISOString() },
      { id: 'random', name: 'Random Chit-Chat', description: 'Memes, food, gaming, and anything random.', createdBy: 'system', createdAt: new Date().toISOString() }
    ],
    messages: {},
    typing: {},
    presence: {}
  };
  
  if (typeof window === 'undefined') return defaultData;
  const stored = localStorage.getItem('chatsphere_db');
  if (!stored) {
    localStorage.setItem('chatsphere_db', JSON.stringify(defaultData));
    return defaultData;
  }
  return JSON.parse(stored);
};

const saveLocalData = (data) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('chatsphere_db', JSON.stringify(data));
  if (mockChannel) {
    mockChannel.postMessage({ type: 'DB_UPDATE' });
  }
  // Notify local listeners in the same window
  mockListeners.forEach(listener => listener({ type: 'DB_UPDATE' }));
};

// Listeners collection for mock mode
const mockListeners = new Set();
if (mockChannel) {
  mockChannel.onmessage = (e) => {
    if (e.data.type === 'DB_UPDATE' || e.data.type === 'TYPING_UPDATE' || e.data.type === 'PRESENCE_UPDATE') {
      mockListeners.forEach(listener => listener(e.data));
    }
  };
}

// ---------------------------------------------------------
// Unified Authentication Services
// ---------------------------------------------------------
export const authService = {
  signUp: async (username, email, password, avatarUrl) => {
    if (isConfigured && auth) {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, {
        displayName: username,
        photoURL: avatarUrl
      });
      return {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: username,
        photoURL: avatarUrl,
        isAnonymous: false
      };
    } else {
      // Mock SignUp
      const dbData = getLocalData();
      if (dbData.users[email]) {
        throw new Error('User already exists');
      }
      const newUser = {
        uid: `u-${Date.now()}`,
        email,
        displayName: username,
        photoURL: avatarUrl,
        password, // stored in plain text for mock dummy login
        isAnonymous: false
      };
      dbData.users[email] = newUser;
      saveLocalData(dbData);
      
      // Set mock active user in sessionStorage
      sessionStorage.setItem('chatsphere_user', JSON.stringify(newUser));
      mockListeners.forEach(l => l({ type: 'AUTH_UPDATE', user: newUser }));
      return newUser;
    }
  },

  signIn: async (email, password) => {
    if (isConfigured && auth) {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: userCredential.user.displayName,
        photoURL: userCredential.user.photoURL,
        isAnonymous: false
      };
    } else {
      // Mock SignIn
      const dbData = getLocalData();
      const matchedUser = dbData.users[email];
      if (!matchedUser || matchedUser.password !== password) {
        throw new Error('Invalid email or password');
      }
      const userSession = { ...matchedUser };
      delete userSession.password;
      sessionStorage.setItem('chatsphere_user', JSON.stringify(userSession));
      mockListeners.forEach(l => l({ type: 'AUTH_UPDATE', user: userSession }));
      return userSession;
    }
  },

  signInAnonymously: async (username, avatarUrl) => {
    if (isConfigured && auth) {
      const userCredential = await firebaseSignInAnonymously(auth);
      await updateProfile(userCredential.user, {
        displayName: username,
        photoURL: avatarUrl
      });
      return {
        uid: userCredential.user.uid,
        displayName: username,
        photoURL: avatarUrl,
        isAnonymous: true
      };
    } else {
      // Mock Anonymous Sign In
      const newUser = {
        uid: `anon-${Date.now()}`,
        displayName: username,
        photoURL: avatarUrl,
        isAnonymous: true
      };
      sessionStorage.setItem('chatsphere_user', JSON.stringify(newUser));
      mockListeners.forEach(l => l({ type: 'AUTH_UPDATE', user: newUser }));
      return newUser;
    }
  },

  updateUserProfile: async (currentUser, newUsername, newAvatarUrl) => {
    if (isConfigured && auth && auth.currentUser) {
      await updateProfile(auth.currentUser, {
        displayName: newUsername,
        photoURL: newAvatarUrl
      });
      return { ...currentUser, displayName: newUsername, photoURL: newAvatarUrl };
    } else {
      const dbData = getLocalData();
      if (!currentUser.isAnonymous && currentUser.email) {
        const userObj = dbData.users[currentUser.email];
        if (userObj) {
          userObj.displayName = newUsername;
          userObj.photoURL = newAvatarUrl;
          dbData.users[currentUser.email] = userObj;
          saveLocalData(dbData);
        }
      }
      const updated = { ...currentUser, displayName: newUsername, photoURL: newAvatarUrl };
      sessionStorage.setItem('chatsphere_user', JSON.stringify(updated));
      mockListeners.forEach(l => l({ type: 'AUTH_UPDATE', user: updated }));
      return updated;
    }
  },

  signOut: async () => {
    if (isConfigured && auth) {
      await firebaseSignOut(auth);
    } else {
      sessionStorage.removeItem('chatsphere_user');
      mockListeners.forEach(l => l({ type: 'AUTH_UPDATE', user: null }));
    }
  },

  onAuthStateChangedListener: (callback) => {
    if (isConfigured && auth) {
      return onAuthStateChanged(auth, (user) => {
        if (user) {
          callback({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            isAnonymous: user.isAnonymous
          });
        } else {
          callback(null);
        }
      });
    } else {
      // Mock Auth State Observer
      const checkUser = () => {
        const stored = sessionStorage.getItem('chatsphere_user');
        return stored ? JSON.parse(stored) : null;
      };
      
      callback(checkUser());
      
      const handler = (event) => {
        if (event.type === 'AUTH_UPDATE') {
          callback(event.user);
        }
      };
      
      mockListeners.add(handler);
      return () => {
        mockListeners.delete(handler);
      };
    }
  }
};

// ---------------------------------------------------------
// Unified Chat & Database Services
// ---------------------------------------------------------
export const dbService = {
  // Rooms API
  createRoom: async (name, description, creatorId) => {
    const roomPayload = {
      name,
      description: description || '',
      createdBy: creatorId,
      createdAt: new Date().toISOString()
    };

    if (isConfigured && db) {
      const docRef = await addDoc(collection(db, 'rooms'), {
        ...roomPayload,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } else {
      const dbData = getLocalData();
      const newRoom = {
        id: `r-${Date.now()}`,
        ...roomPayload
      };
      dbData.rooms.push(newRoom);
      saveLocalData(dbData);
      return newRoom.id;
    }
  },

  getRoomsList: (callback) => {
    if (isConfigured && db) {
      return onSnapshot(collection(db, 'rooms'), (snapshot) => {
        const rooms = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate()?.toISOString() || new Date().toISOString()
        }));
        callback(rooms);
      });
    } else {
      const trigger = () => {
        const dbData = getLocalData();
        callback(dbData.rooms);
      };
      trigger();
      
      const handler = (event) => {
        if (event.type === 'DB_UPDATE') {
          trigger();
        }
      };
      mockListeners.add(handler);
      return () => {
        mockListeners.delete(handler);
      };
    }
  },

  // Messages API
  sendMessage: async (roomId, text, imageBase64, user) => {
    const messagePayload = {
      text: text || '',
      image: imageBase64 || null,
      senderId: user.uid,
      senderName: user.displayName,
      senderAvatar: user.photoURL,
      timestamp: new Date().toISOString()
    };

    if (isConfigured && db) {
      await addDoc(collection(db, `rooms/${roomId}/messages`), {
        ...messagePayload,
        timestamp: serverTimestamp()
      });
    } else {
      const dbData = getLocalData();
      if (!dbData.messages[roomId]) {
        dbData.messages[roomId] = [];
      }
      
      const newMessage = {
        id: `m-${Date.now()}`,
        ...messagePayload
      };
      
      dbData.messages[roomId].push(newMessage);
      saveLocalData(dbData);
    }

    // Trigger bot responses asynchronously if message sent by a real user
    if (user.uid && !user.uid.startsWith('bot-') && text) {
      handleBotTriggers(roomId, text, user);
    }
  },

  getMessagesList: (roomId, callback) => {
    if (isConfigured && db) {
      const q = query(collection(db, `rooms/${roomId}/messages`), orderBy('timestamp', 'asc'));
      return onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate()?.toISOString() || new Date().toISOString()
        }));
        callback(messages);
      });
    } else {
      const trigger = () => {
        const dbData = getLocalData();
        const roomMsgs = dbData.messages[roomId] || [];
        callback(roomMsgs);
      };
      trigger();

      const handler = (event) => {
        if (event.type === 'DB_UPDATE') {
          trigger();
        }
      };
      mockListeners.add(handler);
      return () => {
        mockListeners.delete(handler);
      };
    }
  },

  // Typing Status API
  setTypingStatus: async (roomId, user, isTyping) => {
    if (isConfigured && db) {
      const typingDocRef = doc(db, `rooms/${roomId}/typing`, user.uid);
      if (isTyping) {
        await setDoc(typingDocRef, {
          username: user.displayName,
          timestamp: serverTimestamp()
        });
      } else {
        await deleteDoc(typingDocRef);
      }
    } else {
      const dbData = getLocalData();
      if (!dbData.typing[roomId]) {
        dbData.typing[roomId] = {};
      }
      
      if (isTyping) {
        dbData.typing[roomId][user.uid] = user.displayName;
      } else {
        delete dbData.typing[roomId][user.uid];
      }
      
      saveLocalData(dbData);
      if (mockChannel) {
        mockChannel.postMessage({ type: 'TYPING_UPDATE' });
      }
      mockListeners.forEach(listener => listener({ type: 'TYPING_UPDATE' }));
    }
  },

  getTypingUsers: (roomId, callback) => {
    if (isConfigured && db) {
      return onSnapshot(collection(db, `rooms/${roomId}/typing`), (snapshot) => {
        const typing = snapshot.docs.map(doc => ({
          userId: doc.id,
          username: doc.data().username
        }));
        callback(typing);
      });
    } else {
      const trigger = () => {
        const dbData = getLocalData();
        const typingMap = dbData.typing[roomId] || {};
        const typingList = Object.keys(typingMap).map(userId => ({
          userId,
          username: typingMap[userId]
        }));
        callback(typingList);
      };
      trigger();

      const handler = (event) => {
        if (event.type === 'TYPING_UPDATE' || event.type === 'DB_UPDATE') {
          trigger();
        }
      };
      mockListeners.add(handler);
      return () => {
        mockListeners.delete(handler);
      };
    }
  },

  // Presence / Online Status API
  setUserPresence: async (roomId, user, isOnline) => {
    if (isConfigured && db) {
      const presenceDocRef = doc(db, `rooms/${roomId}/presence`, user.uid);
      if (isOnline) {
        await setDoc(presenceDocRef, {
          username: user.displayName,
          avatar: user.photoURL,
          timestamp: serverTimestamp()
        });
      } else {
        await deleteDoc(presenceDocRef);
      }
    } else {
      const dbData = getLocalData();
      if (!dbData.presence[roomId]) {
        dbData.presence[roomId] = {};
      }
      
      if (isOnline) {
        dbData.presence[roomId][user.uid] = {
          username: user.displayName,
          avatar: user.photoURL
        };
      } else {
        delete dbData.presence[roomId][user.uid];
      }
      
      saveLocalData(dbData);
      if (mockChannel) {
        mockChannel.postMessage({ type: 'PRESENCE_UPDATE' });
      }
      mockListeners.forEach(listener => listener({ type: 'PRESENCE_UPDATE' }));
    }
  },

  getRoomPresence: (roomId, callback) => {
    if (isConfigured && db) {
      return onSnapshot(collection(db, `rooms/${roomId}/presence`), (snapshot) => {
        const users = snapshot.docs.map(doc => ({
          userId: doc.id,
          username: doc.data().username,
          avatar: doc.data().avatar
        }));
        callback(users);
      });
    } else {
      const trigger = () => {
        const dbData = getLocalData();
        const presenceMap = dbData.presence[roomId] || {};
        const presenceList = Object.keys(presenceMap).map(userId => ({
          userId,
          username: presenceMap[userId].username,
          avatar: presenceMap[userId].avatar
        }));
        callback(presenceList);
      };
      trigger();

      const handler = (event) => {
        if (event.type === 'PRESENCE_UPDATE' || event.type === 'DB_UPDATE') {
          trigger();
        }
      };
      mockListeners.add(handler);
      return () => {
        mockListeners.delete(handler);
      };
    }
  }
};

// ---------------------------------------------------------
// Interactive Bots Engine & Data
// ---------------------------------------------------------
const activeTrivia = {};

const astroBot = {
  uid: 'bot-astro',
  displayName: 'AstroBot 🚀',
  photoURL: 'https://api.dicebear.com/7.x/bottts/svg?seed=Astro'
};

const jokeBot = {
  uid: 'bot-joke',
  displayName: 'JokeBot 🤖',
  photoURL: 'https://api.dicebear.com/7.x/bottts/svg?seed=Joke'
};

const echoBot = {
  uid: 'bot-echo',
  displayName: 'EchoBot 📣',
  photoURL: 'https://api.dicebear.com/7.x/bottts/svg?seed=Echo'
};

const spaceFacts = [
  "One day on Venus is longer than one year. It takes Venus 243 Earth days to rotate once on its axis, but only 225 Earth days to travel around the Sun!",
  "Neutron stars are so dense that a single teaspoon of their material would weigh about 6 billion tons on Earth.",
  "Space is completely silent because there is no atmosphere for sound waves to travel through.",
  "Footprints left by astronauts on the Moon will probably stay there for at least 100 million years because there is no atmosphere, wind, or water to erode them.",
  "The Sun is massive: about 1.3 million Earths could fit inside it.",
  "There are more trees on Earth than stars in the Milky Way galaxy. Earth has about 3 trillion trees; the Milky Way has 100-400 billion stars.",
  "Sunset on Mars appears blue because fine dust particles let blue light penetrate the atmosphere more efficiently than longer-wavelength colors."
];

const jokes = [
  "Why do programmers wear glasses? Because they can't C#! 😂",
  "There are 10 types of people in this world: Those who understand binary, and those who don't.",
  "How many programmers does it take to change a light bulb? None, that's a hardware problem!",
  "What do you call a programmer from Finland? Nerdic! 🇫🇮",
  "Why did the React component break up with the HTML element? Because it felt like there was no state in their relationship!",
  "An SQL query walks into a bar, walks up to two tables and asks, 'Can I join you?'",
  "Why did the computer keep sneezing? It had a virus! 🤧"
];

const triviaQuestions = [
  {
    q: "Which planet has the most moons in our solar system?",
    o: "A) Jupiter\nB) Saturn\nC) Uranus\nD) Neptune",
    a: "B",
    e: "Saturn has 146 confirmed moons, overtaking Jupiter's 95 moons!"
  },
  {
    q: "What is the approximate age of the Universe?",
    o: "A) 4.5 billion years\nB) 10 billion years\nC) 13.8 billion years\nD) 20 billion years",
    a: "C",
    e: "Scientific estimates based on cosmic microwave background radiation date the universe to ~13.8 billion years."
  },
  {
    q: "Which galaxy is the closest spiral galaxy to our Milky Way?",
    o: "A) Andromeda\nB) Triangulum\nC) Large Magellanic Cloud\nD) Sombrero Galaxy",
    a: "A",
    e: "Andromeda (M31) is the closest spiral galaxy, located about 2.5 million light-years away."
  },
  {
    q: "What was the first human-made satellite launched into space?",
    o: "A) Apollo 11\nB) Sputnik 1\nC) Voyager 1\nD) Hubble",
    a: "B",
    e: "Sputnik 1 was launched by the Soviet Union on October 4, 1957."
  }
];

const handleBotTriggers = async (roomId, text, user) => {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  // Helper to simulate bot typing and send message
  const sendBotReply = async (botUser, replyText, replyImage = null) => {
    // Start typing
    await dbService.setTypingStatus(roomId, botUser, true);
    
    // Wait 1.5 seconds
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Stop typing
    await dbService.setTypingStatus(roomId, botUser, false);
    
    // Send message
    await dbService.sendMessage(roomId, replyText, replyImage, botUser);
  };

  // AstroBot Triggers
  if (lower.startsWith('@astro')) {
    const cmd = lower.replace('@astro', '').trim();
    
    if (cmd === 'fact') {
      const fact = spaceFacts[Math.floor(Math.random() * spaceFacts.length)];
      await sendBotReply(astroBot, `🌌 **Space Fact:** ${fact}`);
    } 
    else if (cmd === 'trivia') {
      const idx = Math.floor(Math.random() * triviaQuestions.length);
      const question = triviaQuestions[idx];
      activeTrivia[roomId] = { answer: question.a, index: idx };
      
      const reply = `❓ **Trivia Time!**\n\n${question.q}\n\n${question.o}\n\n*Reply with \`@astro A\`, \`@astro B\`, etc. to answer!*`;
      await sendBotReply(astroBot, reply);
    } 
    else if (cmd === 'picture') {
      const imgUrls = [
        "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800",
        "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=800",
        "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=800",
        "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800"
      ];
      const img = imgUrls[Math.floor(Math.random() * imgUrls.length)];
      await sendBotReply(astroBot, "🔭 Here is a stunning view from our telescopes:", img);
    }
    else if (cmd === 'a' || cmd === 'b' || cmd === 'c' || cmd === 'd') {
      const trivia = activeTrivia[roomId];
      if (!trivia) {
        await sendBotReply(astroBot, "❌ There is no active trivia game in this room. Type `@astro trivia` to start one!");
      } else {
        const answer = cmd.toUpperCase();
        const question = triviaQuestions[trivia.index];
        if (answer === trivia.answer) {
          await sendBotReply(astroBot, `🎉 **Correct, ${user.displayName}!**\n\nThe answer is indeed **${trivia.answer}**.\n\nℹ️ ${question.e}`);
        } else {
          await sendBotReply(astroBot, `❌ **Incorrect, ${user.displayName}!**\n\nTry again, or type \`@astro trivia\` for a new question.`);
        }
        delete activeTrivia[roomId];
      }
    }
    else {
      const helpText = `👋 Hello! I am **AstroBot 🚀**. Here is how you can interact with me:\n\n` +
                       `• \`@astro fact\` - Get an amazing space fact.\n` +
                       `• \`@astro trivia\` - Play a space trivia quiz.\n` +
                       `• \`@astro picture\` - Fetch a beautiful celestial photograph.\n` +
                       `• \`@astro help\` - Show this help menu.`;
      await sendBotReply(astroBot, helpText);
    }
  }

  // JokeBot Triggers
  else if (lower.startsWith('@joke')) {
    const cmd = lower.replace('@joke', '').trim();
    if (cmd === 'help') {
      await sendBotReply(jokeBot, "🤖 **JokeBot Help:** Just type `@joke` to hear a funny programmer or tech joke!");
    } else {
      const joke = jokes[Math.floor(Math.random() * jokes.length)];
      await sendBotReply(jokeBot, `💻 **Joke of the Day:**\n\n${joke}`);
    }
  }

  // EchoBot Triggers
  else if (lower.startsWith('@echo')) {
    const cmd = trimmed.substring(5).trim();
    
    if (!cmd || cmd.toLowerCase() === 'help') {
      await sendBotReply(echoBot, "📣 **EchoBot Help:**\n\n• Type \`@echo <text>\` to make me repeat your message.\n• Type \`@echo reverse <text>\` to make me repeat it backwards!");
    } 
    else if (cmd.toLowerCase().startsWith('reverse ')) {
      const textToReverse = cmd.substring(8).trim();
      const reversed = textToReverse.split('').reverse().join('');
      await sendBotReply(echoBot, `📣 *${reversed}*`);
    } 
    else {
      await sendBotReply(echoBot, `📣 *${cmd}*`);
    }
  }
};
