// firebase.js
// CampusBites - Firebase Integration Layer (Dual-Mode: Real Firebase & Reactive Local Mock)

// Key for storage
const MOCK_DB_KEY = 'campusbites_mock_db';
const CONFIG_KEY = 'campusbites_firebase_config';
const USER_KEY = 'campusbites_current_user';

// Initial Mock Database Seed
const initialMockDB = {
  users: {
    "admin_uid": { email: "admin@campusbites.com", role: "admin", name: "Campus Admin" },
    "nescafe_uid": { email: "nescafe@campusbites.com", role: "shopkeeper", shop: "nescafe", name: "Nescafe Owner" },
    "kitchenatte_uid": { email: "kitchenatte@campusbites.com", role: "shopkeeper", shop: "kitchenatte", name: "Kitchenatte Owner" },
    "kathiroll_uid": { email: "kathiroll@campusbites.com", role: "shopkeeper", shop: "kathiroll", name: "Kathi Roll Owner" },
    "pizzabar_uid": { email: "pizzabar@campusbites.com", role: "shopkeeper", shop: "pizzabar", name: "Pizza Bar Owner" },
    "dosahouse_uid": { email: "dosahouse@campusbites.com", role: "shopkeeper", shop: "dosahouse", name: "Dosa House Owner" },
    "delivery1_uid": { email: "delivery1@campusbites.com", role: "delivery", name: "Raju (Delivery)" },
    "delivery2_uid": { email: "delivery2@campusbites.com", role: "delivery", name: "Amit (Delivery)" }
  },
  shops: {
    nescafe: {
      name: "Nescafe",
      menu: {
        "item1": { name: "Espresso", price: 60, desc: "Freshly brewed classic espresso", veg: true, image: "☕" },
        "item2": { name: "Cappuccino", price: 80, desc: "Rich espresso with steamed milk foam", veg: true, image: "☕" },
        "item3": { name: "Iced Latte", price: 95, desc: "Espresso and chilled milk over ice", veg: true, image: "🥤" },
        "item4": { name: "Hazelnut Frappe", price: 120, desc: "Creamy blended hazelnut iced coffee", veg: true, image: "🥤" },
        "item5": { name: "Classic Maggi", price: 50, desc: "The ultimate campus comfort food", veg: true, image: "🍜" }
      }
    },
    kitchenatte: {
      name: "Kitchenatte",
      menu: {
        "item1": { name: "Veg Fried Rice", price: 110, desc: "Stir-fried rice with assorted veggies", veg: true, image: "🍚" },
        "item2": { name: "Hakka Noodles", price: 120, desc: "Wok-tossed noodles in mild spices", veg: true, image: "🍜" },
        "item3": { name: "Veg Manchurian", price: 130, desc: "Vegetable dumplings in savory gravy", veg: true, image: "🧆" },
        "item4": { name: "Paneer Butter Combo", price: 180, desc: "Paneer butter masala with 2 butter naans", veg: true, image: "🍛" },
        "item5": { name: "Chicken Biryani", price: 200, desc: "Aromatic basmati rice with spiced chicken", veg: false, image: "🍛" }
      }
    },
    kathiroll: {
      name: "Kathi Roll",
      menu: {
        "item1": { name: "Double Egg Roll", price: 70, desc: "Golden fried flatbread wrapped with 2 eggs", veg: false, image: "🌯" },
        "item2": { name: "Paneer Tikka Roll", price: 90, desc: "Spiced cottage cheese tikka wrap", veg: true, image: "🌯" },
        "item3": { name: "Chicken Seekh Roll", price: 110, desc: "Juicy chicken seekh kababs in soft wrap", veg: false, image: "🌯" },
        "item4": { name: "Cheese Corn Roll", price: 95, desc: "Sweet corn and melting mozzarella wrap", veg: true, image: "🌯" }
      }
    },
    pizzabar: {
      name: "Pizza Bar",
      menu: {
        "item1": { name: "Margherita Pizza", price: 150, desc: "Classic tomato sauce, fresh mozzarella & basil", veg: true, image: "🍕" },
        "item2": { name: "Veggie Supreme Pizza", price: 190, desc: "Onions, bell peppers, olives & sweet corn", veg: true, image: "🍕" },
        "item3": { name: "Pepperoni Double Pizza", price: 240, desc: "Spicy pepperoni slices with double cheese", veg: false, image: "🍕" },
        "item4": { name: "Garlic Breadsticks", price: 90, desc: "Baked bread sticks infused with garlic butter", veg: true, image: "🥖" },
        "item5": { name: "Paneer El Paso Pizza", price: 220, desc: "Spiced paneer, jalapenos, and red paprika", veg: true, image: "🍕" }
      }
    },
    dosahouse: {
      name: "Dosa House",
      menu: {
        "item1": { name: "Plain Dosa", price: 60, desc: "Crispy paper-thin rice crepe with sambar", veg: true, image: "🥞" },
        "item2": { name: "Masala Dosa", price: 80, desc: "Crispy dosa filled with spiced potato mash", veg: true, image: "🥞" },
        "item3": { name: "Paneer Butter Dosa", price: 110, desc: "Dosa stuffed with butter paneer bhurji", veg: true, image: "🥞" },
        "item4": { name: "Idli (2 Pcs)", price: 50, desc: "Steamed fluffy rice cakes with chutney & sambar", veg: true, image: "⚪" },
        "item5": { name: "Onion Rava Masala Dosa", price: 95, desc: "Crispy semolina dosa filled with onions & potatoes", veg: true, image: "🥞" }
      }
    }
  },
  orders: {}
};

// Initial setup of Mock DB if empty
if (!localStorage.getItem(MOCK_DB_KEY)) {
  localStorage.setItem(MOCK_DB_KEY, JSON.stringify(initialMockDB));
}

// Helpers for paths (e.g. "users/uid" -> obj.users.uid)
function parsePath(pathStr) {
  return pathStr.split('/').filter(p => p.trim() !== '');
}

function getMockDB() {
  try {
    return JSON.parse(localStorage.getItem(MOCK_DB_KEY)) || initialMockDB;
  } catch (e) {
    return initialMockDB;
  }
}

function saveMockDB(db) {
  localStorage.setItem(MOCK_DB_KEY, JSON.stringify(db));
  // Notify other tabs immediately
  window.dispatchEvent(new Event('storage'));
}

// Reactive listeners cache for mock db
const listeners = [];

window.addEventListener('storage', () => {
  // Fire listeners when storage updates
  listeners.forEach(lis => {
    const data = getMockPath(lis.path);
    lis.callback(new MockSnapshot(lis.path, data));
  });
});

class MockSnapshot {
  constructor(path, data) {
    this._path = path;
    this._data = data;
  }
  val() {
    return JSON.parse(JSON.stringify(this._data));
  }
  exists() {
    return this._data !== undefined && this._data !== null;
  }
}

function getMockPath(pathStr) {
  const parts = parsePath(pathStr);
  let current = getMockDB();
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  return current;
}

function setMockPath(pathStr, val) {
  const parts = parsePath(pathStr);
  const db = getMockDB();
  let current = db;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!current[part]) {
      current[part] = {};
    }
    current = current[part];
  }
  const lastKey = parts[parts.length - 1];
  if (val === null) {
    delete current[lastKey];
  } else {
    current[lastKey] = val;
  }
  saveMockDB(db);
  // Trigger local listeners
  listeners.forEach(lis => {
    if (lis.path === pathStr || lis.path.startsWith(pathStr + '/') || pathStr.startsWith(lis.path + '/')) {
      const data = getMockPath(lis.path);
      lis.callback(new MockSnapshot(lis.path, data));
    }
  });
}

// Define public exports
export let isMock = true;
export let auth = null;
export let db = null;

// Firebase References & Operations Placeholder
export let ref = null;
export let set = null;
export let push = null;
export let update = null;
export let getVal = null; // matching standard firebase 'get'
export let onValue = null;

// Configuration functions
export function getFirebaseConfig() {
  try {
    return JSON.parse(localStorage.getItem(CONFIG_KEY));
  } catch (e) {
    return null;
  }
}

export function saveFirebaseConfig(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  location.reload();
}

export function clearFirebaseConfig() {
  localStorage.removeItem(CONFIG_KEY);
  location.reload();
}

// Initialization Flow
const firebaseConfig = {
  apiKey: "AIzaSyDpvWl8i-MD8h-WaGugG5YXvI56ApV6zL4",
  authDomain: "campusbites-75a95.firebaseapp.com",
  databaseURL: "https://campusbites-75a95-default-rtdb.firebaseio.com",
  projectId: "campusbites-75a95",
  appId: "1:938973332285:web:104d704c8387d63d507b54"
};

if (firebaseConfig && firebaseConfig.apiKey && firebaseConfig.databaseURL) {
  // REAL FIREBASE MODE
  isMock = false;
  try {
    // Dynamic import of Firebase modules via CDN
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js');
    const { 
      getDatabase, 
      ref: dbRef, 
      set: dbSet, 
      push: dbPush, 
      update: dbUpdate, 
      get: dbGet, 
      onValue: dbOnValue 
    } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js');
    const { 
      getAuth, 
      signInWithEmailAndPassword, 
      createUserWithEmailAndPassword, 
      signOut, 
      onAuthStateChanged 
    } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    const firebaseAuth = getAuth(app);

    // Map exports to Real Firebase
    ref = dbRef;
    set = dbSet;
    push = (r) => {
      // Wrapper to match push key extraction
      const newRef = dbPush(r);
      return {
        key: newRef.key,
        ref: newRef
      };
    };
    update = dbUpdate;
    getVal = dbGet;
    onValue = dbOnValue;

    // Wrap Auth
    auth = {
      currentUser: null,
      onAuthStateChanged: (cb) => {
        onAuthStateChanged(firebaseAuth, async (user) => {
          if (user) {
            // Get user role from db if available
            dbGet(dbRef(db, `users/${user.uid}`)).then(snapshot => {
              let role = 'student';
              let name = user.email.split('@')[0];
              let shop = '';
              if (snapshot.exists()) {
                const data = snapshot.val();
                role = data.role || role;
                name = data.name || name;
                shop = data.shop || '';
              }
              auth.currentUser = {
                uid: user.uid,
                email: user.email,
                role: role,
                name: name,
                shop: shop
              };
              cb(auth.currentUser);
            }).catch(() => {
              auth.currentUser = { uid: user.uid, email: user.email, role: 'student', name: user.email.split('@')[0] };
              cb(auth.currentUser);
            });
          } else {
            auth.currentUser = null;
            cb(null);
          }
        });
      },
      signIn: (email, password) => signInWithEmailAndPassword(firebaseAuth, email, password),
      signUp: async (email, password, name, role = 'student', shop = '') => {
        const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
        const uid = userCredential.user.uid;
        await dbSet(dbRef(db, `users/${uid}`), {
          email,
          name,
          role,
          shop
        });
        return userCredential;
      },
      logOut: () => signOut(firebaseAuth)
    };
  } catch (err) {
    console.error("Failed to initialize Real Firebase, falling back to Local Mock Mode:", err);
    setupMockAPI();
  }
} else {
  // MOCK MODE
  setupMockAPI();
}

function setupMockAPI() {
  isMock = true;
  
  // Database Functions Mapping
  ref = (dbObj, pathStr) => {
    return pathStr || ''; // Just return the path string
  };

  set = async (pathRef, data) => {
    setMockPath(pathRef, data);
    return true;
  };

  push = (pathRef) => {
    const key = 'id_' + Date.now() + Math.random().toString(36).substring(2, 7);
    const newPath = pathRef ? `${pathRef}/${key}` : key;
    return {
      key: key,
      ref: newPath
    };
  };

  update = async (pathRef, data) => {
    const db = getMockDB();
    const parts = parsePath(pathRef);
    let current = db;
    for (const part of parts) {
      if (!current[part]) current[part] = {};
      current = current[part];
    }
    Object.assign(current, data);
    saveMockDB(db);
    
    // Trigger listeners
    listeners.forEach(lis => {
      if (lis.path === pathRef || lis.path.startsWith(pathRef + '/') || pathRef.startsWith(lis.path + '/')) {
        const data = getMockPath(lis.path);
        lis.callback(new MockSnapshot(lis.path, data));
      }
    });
    return true;
  };

  getVal = async (pathRef) => {
    const data = getMockPath(pathRef);
    return new MockSnapshot(pathRef, data);
  };

  onValue = (pathRef, callback) => {
    listeners.push({ path: pathRef, callback });
    // Trigger immediately
    const data = getMockPath(pathRef);
    callback(new MockSnapshot(pathRef, data));
    // Return unsubscribe function
    return () => {
      const idx = listeners.findIndex(lis => lis.path === pathRef && lis.callback === callback);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  };

  // Auth Operations
  let activeUser = null;
  try {
    activeUser = JSON.parse(localStorage.getItem(USER_KEY));
  } catch (e) {}

  const authCallbacks = [];

  auth = {
    currentUser: activeUser,
    onAuthStateChanged: (cb) => {
      authCallbacks.push(cb);
      // Execute immediately
      cb(activeUser);
      return () => {
        const idx = authCallbacks.indexOf(cb);
        if (idx !== -1) authCallbacks.splice(idx, 1);
      };
    },
    signIn: async (email, password) => {
      const db = getMockDB();
      const users = db.users || {};
      
      // Find matching user by email
      const userEntry = Object.entries(users).find(([uid, u]) => u.email.toLowerCase() === email.toLowerCase());
      
      if (!userEntry) {
        throw new Error("Auth: User not found in database.");
      }

      // Check password (simple verification for testing: password matches email username or is just accepted)
      const [uid, user] = userEntry;
      const loggedUser = {
        uid: uid,
        email: user.email,
        role: user.role || 'student',
        name: user.name || user.email.split('@')[0],
        shop: user.shop || ''
      };
      
      activeUser = loggedUser;
      localStorage.setItem(USER_KEY, JSON.stringify(loggedUser));
      auth.currentUser = loggedUser;
      
      authCallbacks.forEach(cb => cb(loggedUser));
      return { user: loggedUser };
    },
    signUp: async (email, password, name, role = 'student', shop = '') => {
      const db = getMockDB();
      const users = db.users || {};
      
      // Check if user already exists
      const exists = Object.values(users).some(u => u.email.toLowerCase() === email.toLowerCase());
      if (exists) {
        throw new Error("Auth: User email already registered.");
      }

      const uid = 'usr_' + Date.now();
      const newUser = { email, name, role, shop };
      
      // Save user to mock users table
      users[uid] = newUser;
      db.users = users;
      saveMockDB(db);

      const loggedUser = {
        uid: uid,
        email: email,
        role: role,
        name: name,
        shop: shop
      };

      activeUser = loggedUser;
      localStorage.setItem(USER_KEY, JSON.stringify(loggedUser));
      auth.currentUser = loggedUser;

      authCallbacks.forEach(cb => cb(loggedUser));
      return { user: loggedUser };
    },
    logOut: async () => {
      activeUser = null;
      localStorage.removeItem(USER_KEY);
      auth.currentUser = null;
      authCallbacks.forEach(cb => cb(null));
      return true;
    }
  };
}
