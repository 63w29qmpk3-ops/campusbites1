// seed.js
// CampusBites - Database Seeder Utility
// Run this script to populate your live Firebase Realtime Database with default shops & menus!

const https = require('https');

const DB_URL = 'https://campusbites-75a95-default-rtdb.firebaseio.com/shops.json';

const defaultShops = {
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
};

const payload = JSON.stringify(defaultShops);

const url = new URL(DB_URL);
const options = {
  hostname: url.hostname,
  port: 443,
  path: url.pathname,
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
};

console.log('Connecting to database and sending payload...');

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('\n✅ Database successfully seeded with default shops & menus!');
      console.log('You can now see all products on the student ordering page.');
    } else {
      console.error(`\n❌ Failed to seed database. Status Code: ${res.statusCode}`);
      console.error(`Response: ${body}`);
      console.error('\nMake sure your Realtime Database Rules are set to: { ".read": true, ".write": true }');
    }
  });
});

req.on('error', (e) => {
  console.error(`\n❌ Network Error connecting to database: ${e.message}`);
});

req.write(payload);
req.end();
