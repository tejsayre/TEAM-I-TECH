const firebaseConfig = {
    apiKey: "AIzaSyALtpXEH6dKLndE6HJLeCSTHRAfsU6w-MY",
    authDomain: "i-tech-online-store.firebaseapp.com",
    projectId: "i-tech-online-store",
    storageBucket: "i-tech-online-store.appspot.com" // <-- Add this line
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

const ADMIN_EMAILS = [
    "eugeneclement@gmail.com",
    "test@gmail.com"
    // Add more admin emails here
];

// --- CART LOGIC ---

cart = JSON.parse(localStorage.getItem('cart')) || [];

function updateCartCount() {
    document.getElementById('cartCount').textContent = cart.reduce((sum, item) => sum + item.qty, 0);
}

function renderCart() {
    const list = document.getElementById('cartList');
    list.innerHTML = '';
    let total = 0;
    if (cart.length === 0) {
        list.innerHTML = '<li style="text-align:center;color:#888;">Your cart is empty.</li>';
    } else {
        cart.forEach((item, idx) => {
            const priceNum = parseInt(item.price.replace(/[^\d]/g, '')) * item.qty;
            total += priceNum;
            list.innerHTML += `
                <li style="display:flex;align-items:center;gap:1rem;margin-bottom:1rem;border-bottom:1px solid #eee;padding-bottom:1rem;">
                    <img src="${item.img}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;">
                    <div style="flex:1;">
                        <div style="font-weight:bold;">${item.name}</div>
                        <div style="color:#888;">${item.price}</div>
                        <div style="margin-top:0.5rem;">
                            <button onclick="changeQty(${idx},-1)" style="padding:2px 8px;">-</button>
                            <span style="margin:0 8px;">${item.qty}</span>
                            <button onclick="changeQty(${idx},1)" style="padding:2px 8px;">+</button>
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-weight:bold;">₱${priceNum.toLocaleString()}</div>
                        <button onclick="removeFromCart(${idx})" style="margin-top:0.5rem;color:#e53935;background:none;border:none;font-size:1.2em;cursor:pointer;">Remove</button>
                    </div>
                </li>
            `;
        });
    }
    document.getElementById('cartTotal').textContent = '₱' + total.toLocaleString();
}

function removeFromCart(idx) {
    cart.splice(idx, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
    updateCartCount();
}

function changeQty(idx, delta) {
    cart[idx].qty += delta;
    if (cart[idx].qty < 1) cart[idx].qty = 1;
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
    updateCartCount();
}

document.getElementById('cartNav').onclick = function(e) {
    e.preventDefault();
    renderCart();
    document.getElementById('cartModal').style.display = 'flex';
};

function closeCart() {
    document.getElementById('cartModal').style.display = 'none';
}

function checkoutCart() {
    if (cart.length === 0) {
        showNotification('Your cart is empty!');
        return;
    }
    if (!auth.currentUser) {
        showNotification('You must be logged in to place an order!');
        return;
    }
    const order = {
        uid: auth.currentUser.uid,
        items: [...cart],
        date: new Date().toLocaleString(),
        total: document.getElementById('cartTotal').textContent
    };
    db.collection('orderHistory').add(order)
      .then(() => {
          showNotification('Order placed!');
          cart = [];
          localStorage.setItem('cart', JSON.stringify(cart));
          console.log('Cart after purchase:', cart, localStorage.getItem('cart'));
          updateCartCount();
          renderCart();
          document.getElementById('cartList').innerHTML = '<li style="text-align:center;color:#888;">Your cart is empty.</li>';
          document.getElementById('cartTotal').textContent = '₱0';
          closeCart();
      })
      .catch(err => showNotification('Order failed: ' + err.message));
}

// Modal functions
function showModal() {
    document.getElementById('authModal').style.display = 'flex';
}
function closeModal() {
    document.getElementById('authModal').style.display = 'none';
    document.getElementById('authMsg').innerText = '';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}

// Auth functions
function login() {
    const email = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    if (!email || !email.includes('@')) {
        document.getElementById('authMsg').innerText = 'Please enter a valid email address.';
        return;
    }
    if (!password) {
        document.getElementById('authMsg').innerText = 'Please enter your password.';
        return;
    }
    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            closeModal();
            showNotification('Login successful!');
            setTimeout(() => window.location.reload(), 800); // <-- Auto-refresh after login
        })
        .catch(error => {
            document.getElementById('authMsg').innerText = error.message;
        });
}

function signup() {
    const email = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    if (!email || !email.includes('@')) {
        document.getElementById('authMsg').innerText = 'Please enter a valid email address.';
        return;
    }
    if (!password || password.length < 8) {
        document.getElementById('authMsg').innerText = 'Password must be at least 8 characters long.';
        return;
    }
    auth.createUserWithEmailAndPassword(email, password)
        .then(() => {
            document.getElementById('authMsg').innerText = 'Sign up successful! You can now log in.';
        })
        .catch(error => {
            document.getElementById('authMsg').innerText = error.message;
        });
}

function logout() {
    auth.signOut().then(() => {
        // Clear cart and orders on logout
        cart = [];
        orders = [];
        localStorage.removeItem('cart');
        localStorage.removeItem('orders');
        updateCartCount();
        showNotification('Logged out!');
        setTimeout(() => window.location.reload(), 800); // <-- Auto-refresh after logout
    });
}

// Auth UI state
auth.onAuthStateChanged(async user => {
    const userDisplay = document.getElementById('userDisplay');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    if (user) {
        userDisplay.style.display = 'flex';
        logoutBtn.style.display = 'inline-block';
        loginBtn.style.display = 'none';
        // Set greeting based on admin status
        let greet = isAdmin() ? "Welcome, Admin!" : "Welcome, Customer!";
        // If userDisplay has a text node, update it; otherwise, add one
        if (userDisplay.childNodes.length > 0) {
            userDisplay.childNodes[0].textContent = greet + " ";
        } else {
            userDisplay.textContent = greet + " ";
            userDisplay.appendChild(logoutBtn);
        }
    } else {
        loginBtn.style.display = 'inline-block';
        userDisplay.style.display = 'none';
        logoutBtn.style.display = 'none';
    }

    // Always clear order history on login
    if (user) {
        const ordersSnapshot = await db.collection('orderHistory')
            .where('uid', '==', user.uid)
            .get();
        const batch = db.batch();
        ordersSnapshot.forEach(doc => batch.delete(doc.ref));
        if (!ordersSnapshot.empty) {
            await batch.commit();
        }
    }

    updateAddProductBtn();
    updateOrderHistoryLink();
});
document.getElementById('logoutBtn').onclick = logout;

// Show/hide Add Product button
function updateAddProductBtn() {
    const btn = document.getElementById('addProductBtn');
    if (isAdmin()) {
        btn.style.display = 'inline-block';
    } else {
        btn.style.display = 'none';
    }
}

// Product rendering and real-time updates
function renderProducts(products) {
    const container = document.getElementById('productList');
    container.innerHTML = '';
    products.forEach(product => {
        container.innerHTML += `
        <div class="product-card" data-id="${product.id}">
            <img src="${product.imageUrl || 'pictures/default.jpg'}" alt="Product" class="product-image">
            <h3 class="product-title">${product.name}</h3>
            <p class="product-price">${product.price}</p>
            <p>${product.description}</p>
            ${auth.currentUser && isAdmin() ? `
            <div class="product-actions">
                <button class="btn add-to-cart-btn">Add to Cart</button>
                <button class="btn update-btn" onclick="showUpdateProduct('${product.id}')">Update</button>
            </div>
            ` : auth.currentUser ? `
            <div class="product-actions">
                <button class="btn add-to-cart-btn">Add to Cart</button>
            </div>
            ` : ''}
        </div>`;
    });

    // Attach Add to Cart event listeners (login required)
    if (auth.currentUser) {
        container.querySelectorAll('.add-to-cart-btn').forEach(btn => {
            btn.onclick = function() {
                const card = btn.closest('.product-card');
                const name = card.querySelector('.product-title').textContent;
                const price = card.querySelector('.product-price').textContent;
                const img = card.querySelector('.product-image').src;
                let found = cart.find(item => item.name === name && item.price === price);
                if (found) {
                    found.qty += 1;
                } else {
                    cart.push({ name, price, img, qty: 1 });
                }
                localStorage.setItem('cart', JSON.stringify(cart));
                updateCartCount();
                showNotification('Added to cart!');
            };
        });
    }
}

// Loader functions
function showProductLoader() {
    document.getElementById('productLoader').style.display = 'flex';
    document.getElementById('productList').style.display = 'none';
}
function hideProductLoader() {
    document.getElementById('productLoader').style.display = 'none';
    document.getElementById('productList').style.display = 'grid';
}

// Real-time Firestore listener
db.collection('products').onSnapshot(snapshot => {
    showProductLoader();
    const products = [];
    snapshot.forEach(doc => products.push({ id: doc.id, ...doc.data() }));
    console.log('Fetched products:', products); // Add this line
    renderProducts(products);
    hideProductLoader();
});

// Home button refresh
document.getElementById('homeBtn').addEventListener('click', function(e) {
    e.preventDefault();
    window.location.reload();
});

// --- ORDER HISTORY LOGIC ---

// Show order history modal
document.getElementById('orderHistoryLink').onclick = function(e) {
    e.preventDefault();
    renderOrderHistory();
    document.getElementById('orderHistoryModal').style.display = 'flex';
};

// Render order history
function renderOrderHistory() {
    const list = document.getElementById('orderHistoryList');
    list.innerHTML = '';
    if (!auth.currentUser) {
        list.innerHTML = '<li>Please log in to view your order history.</li>';
        return;
    }
    db.collection('orderHistory')
      .where('uid', '==', auth.currentUser.uid)
      .orderBy('date', 'desc')
      .get()
      .then(snapshot => {
          if (snapshot.empty) {
              list.innerHTML = '<li>No orders yet.</li>';
              return;
          }
          snapshot.forEach(doc => {
              const order = doc.data();
              let items = order.items.map(i => `${i.name} x${i.qty}`).join(', ');
              list.innerHTML += `<li>
                  <div><strong>${order.date}</strong></div>
                  <div>${items}</div>
                  <div>Total: ${order.total}</div>
              </li>`;
          });
      })
      .catch(err => {
          list.innerHTML = `<li>Error loading orders: ${err.message}</li>`;
      });
}

// Close order history modal
function closeOrderHistory() {
    document.getElementById('orderHistoryModal').style.display = 'none';
}

// Show the Edit Product modal and fill with product data
function showUpdateProduct(productId) {
    // Fetch product data from Firestore
    db.collection('products').doc(productId).get().then(doc => {
        if (!doc.exists) return showNotification('Product not found!');
        const data = doc.data();
        document.getElementById('editProdName').value = data.name || '';
        document.getElementById('editProdPrice').value = data.price || '';
        document.getElementById('editProdDesc').value = data.description || '';
        document.getElementById('editProdPreview').src = data.imageUrl || '';
        document.getElementById('editProdPreview').style.display = data.imageUrl ? 'block' : 'none';
        document.getElementById('productEditorModal').style.display = 'flex';
        // Store the productId for update/delete
        document.getElementById('editProductForm').dataset.productId = productId;
    });
}

// Handle update product form submit
document.getElementById('editProductForm').onsubmit = function(e) {
    e.preventDefault();
    const productId = this.dataset.productId;
    const name = document.getElementById('editProdName').value.trim();
    const price = document.getElementById('editProdPrice').value.trim();
    const description = document.getElementById('editProdDesc').value.trim();
    // Use the preview image src as the imageUrl
    const imageUrl = document.getElementById('editProdPreview').src;

    updateProductFirestore(productId, name, price, description, imageUrl);
};

function updateProductFirestore(productId, name, price, description, imageUrl) {
    db.collection('products').doc(productId).update({
        name, price, description, imageUrl
    }).then(() => {
        showNotification('Product updated!');
        document.getElementById('productEditorModal').style.display = 'none';
    }).catch(err => showNotification('Update failed: ' + err.message));
}

// Handle delete product
document.getElementById('deleteProductBtn').onclick = function() {
    const productId = document.getElementById('editProductForm').dataset.productId;
    if (!confirm('Are you sure you want to delete this product?')) return;
    db.collection('products').doc(productId).delete().then(() => {
        showNotification('Product deleted!');
        // Optionally close the modal if open
        document.getElementById('productEditorModal').style.display = 'none';
    }).catch(err => showNotification('Delete failed: ' + err.message));
};

// Close product editor modal
function closeProductEditor() {
    document.getElementById('productEditorModal').style.display = 'none';
}

// About Us modal
document.getElementById('aboutUsFooterLink').onclick = function(e) {
    e.preventDefault();
    document.getElementById('aboutUsModal').style.display = 'flex';
}

// Close About Us modal
function closeAboutUs() {
    document.getElementById('aboutUsModal').style.display = 'none';
}

// --- ADD PRODUCT LOGIC ---

// Handle Add Product form submit (URL only, no file upload)
document.getElementById('addProductForm').onsubmit = async function(e) {
    e.preventDefault();
    const name = document.getElementById('addProdName').value.trim();
    const price = document.getElementById('addProdPrice').value.trim();
    const description = document.getElementById('addProdDesc').value.trim();
    const imageUrlInput = document.getElementById('addProdImageUrl').value.trim();
    const msg = document.getElementById('addProductMsg');
    msg.textContent = '';

    if (!imageUrlInput) {
        msg.style.color = 'red';
        msg.textContent = 'Please provide an image URL (file upload is disabled).';
        return;
    }

    try {
        await db.collection('products').add({
            name,
            price,
            description,
            imageUrl: imageUrlInput
        });
        msg.style.color = 'green';
        msg.textContent = 'Product added!';
        setTimeout(() => {
            document.getElementById('addProductModal').style.display = 'none';
            msg.textContent = '';
            document.getElementById('addProductForm').reset();
            // Optionally clear preview if you use one
            // document.getElementById('addProdPreview').style.display = 'none';
        }, 1000);
    } catch (err) {
        msg.style.color = 'red';
        msg.textContent = 'Error: ' + err.message;
    }
};

function showNotification(message) {
    let notif = document.getElementById('notification');
    if (!notif) {
        notif = document.createElement('div');
        notif.id = 'notification';
        notif.style.position = 'fixed';
        notif.style.top = '20px';
        notif.style.right = '20px';
        notif.style.background = 'var(--primary-green, #4CAF50)';
        notif.style.color = '#fff';
        notif.style.padding = '12px 24px';
        notif.style.borderRadius = '6px';
        notif.style.zIndex = 9999;
        notif.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        document.body.appendChild(notif);
    }
    notif.textContent = message;
    notif.style.display = 'block';
    setTimeout(() => {
        notif.style.display = 'none';
    }, 2000);
}

function isAdmin() {
    return auth.currentUser && ADMIN_EMAILS.includes(auth.currentUser.email);
}

function updateOrderHistoryLink() {
    const orderHistoryLink = document.getElementById('orderHistoryLink');
    if (auth.currentUser) {
        orderHistoryLink.style.display = 'inline-block';
    } else {
        orderHistoryLink.style.display = 'none';
    }
}


