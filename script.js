const firebaseConfig = {
    apiKey: "AIzaSyALtpXEH6dKLndE6HJLeCSTHRAfsU6w-MY",
    authDomain: "i-tech-online-store.firebaseapp.com",
    projectId: "i-tech-online-store",
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

let cart = JSON.parse(localStorage.getItem('cart')) || [];
let orders = JSON.parse(localStorage.getItem('orders')) || [];

// Update cart count in nav
function updateCartCount() {
    document.getElementById('cartCount').textContent = cart.reduce((sum, item) => sum + item.qty, 0);
}
updateCartCount();

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
    });
}

// Auth UI state
auth.onAuthStateChanged(user => {
    const userDisplay = document.getElementById('userDisplay');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    if (user) {
        userDisplay.style.display = 'flex';
        logoutBtn.style.display = 'inline-block';
        loginBtn.style.display = 'none';
        // Set only the text node (assumes: Welcome, Admin! <button ...>Logout</button>)
        if (userDisplay.childNodes.length > 0) {
            userDisplay.childNodes[0].textContent = "Welcome, Admin! ";
        }
    } else {
        loginBtn.style.display = 'inline-block';
        userDisplay.style.display = 'none';
        logoutBtn.style.display = 'none';
    }
    updateAddProductBtn();
});
document.getElementById('logoutBtn').onclick = logout;

// Show/hide Add Product button
function updateAddProductBtn() {
    const btn = document.getElementById('addProductBtn');
    if (auth.currentUser) {
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
            ${auth.currentUser ? `
            <div class="product-actions">
                <button class="btn add-to-cart-btn">Add to Cart</button>
                <button class="btn update-btn" onclick="showUpdateProduct('${product.id}')">Update</button>
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
    renderProducts(products);
    hideProductLoader();
});

// Home button refresh
document.getElementById('homeBtn').addEventListener('click', function(e) {
    e.preventDefault();
    window.location.reload();
});

// --- CART MODAL LOGIC ---

// Show cart modal
document.getElementById('cartNav').onclick = function(e) {
    e.preventDefault();
    renderCart();
    document.getElementById('cartModal').style.display = 'flex';
};

// Render cart items
function renderCart() {
    const list = document.getElementById('cartList');
    list.innerHTML = '';
    let total = 0;
    cart.forEach((item, idx) => {
        const priceNum = parseInt(item.price.replace(/[^\d]/g, '')) * item.qty;
        total += priceNum;
        list.innerHTML += `
            <li style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;">
                <img src="${item.img}" style="width:40px;height:40px;object-fit:cover;border-radius:5px;">
                <span style="flex:1;">${item.name} x${item.qty}</span>
                <span>₱${priceNum.toLocaleString()}</span>
                <button onclick="removeFromCart(${idx})" style="margin-left:0.5rem;color:#e53935;background:none;border:none;font-size:1.2em;cursor:pointer;">&times;</button>
            </li>
        `;
    });
    document.getElementById('cartTotal').textContent = '₱' + total.toLocaleString();
}

// Remove item from cart
function removeFromCart(idx) {
    cart.splice(idx, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
    updateCartCount();
}

// Close cart modal
function closeCart() {
    document.getElementById('cartModal').style.display = 'none';
}

// Checkout cart
function checkoutCart() {
    if (cart.length === 0) {
        showNotification('Your cart is empty!');
        return;
    }
    // Save order
    const order = {
        items: [...cart],
        date: new Date().toLocaleString(),
        total: document.getElementById('cartTotal').textContent
    };
    orders.push(order);
    localStorage.setItem('orders', JSON.stringify(orders));
    cart = [];
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    renderCart();
    closeCart();
    showNotification('Order placed!');
}

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
    if (orders.length === 0) {
        list.innerHTML = '<li>No orders yet.</li>';
        return;
    }
    orders.forEach(order => {
        let items = order.items.map(i => `${i.name} x${i.qty}`).join(', ');
        list.innerHTML += `<li>
            <div><strong>${order.date}</strong></div>
            <div>${items}</div>
            <div>Total: ${order.total}</div>
        </li>`;
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
    let imageUrl = document.getElementById('editProdPreview').src;

    // If a new image is selected, update the preview and use it (Base64 or URL)
    const imageFile = document.getElementById('editProdImage').files[0];
    if (imageFile) {
        const reader = new FileReader();
        reader.onload = function(e) {
            imageUrl = e.target.result;
            updateProductFirestore(productId, name, price, description, imageUrl);
        };
        reader.readAsDataURL(imageFile);
        return;
    }
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


