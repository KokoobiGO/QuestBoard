/**
 * Shop Module
 * Handles shop functionality, avatar purchases, and equipping items
 * Uses localStorage for inventory and user_stats table for equipped avatar
 */

export function initShop(supabase) {
    let availableAvatars = [];
    let currentUser = null;

    /**
     * Initialize shop with predefined avatars
     */
    function initializeAvatars() {
        availableAvatars = [
            {
                id: 'avatar_knight',
                name: 'Knight',
                price: 100,
                type: 'avatar',
                image: '🛡️',
                description: 'A brave knight ready for any quest'
            },
            {
                id: 'avatar_wizard',
                name: 'Wizard',
                price: 150,
                type: 'avatar',
                image: '🧙‍♂️',
                description: 'A wise wizard with magical powers'
            },
            {
                id: 'avatar_ninja',
                name: 'Ninja',
                price: 200,
                type: 'avatar',
                image: '🥷',
                description: 'A stealthy ninja master'
            },
            {
                id: 'avatar_pirate',
                name: 'Pirate',
                price: 120,
                type: 'avatar',
                image: '🏴‍☠️',
                description: 'A fearless pirate captain'
            },
            {
                id: 'avatar_robot',
                name: 'Robot',
                price: 250,
                type: 'avatar',
                image: '🤖',
                description: 'A futuristic robot companion'
            },
            {
                id: 'avatar_astronaut',
                name: 'Astronaut',
                price: 300,
                type: 'avatar',
                image: '👨‍🚀',
                description: 'An explorer of the cosmos'
            }
        ];
    }

    /**
     * Load user inventory from localStorage
     */
    function loadUserInventory(userId) {
        try {
            const inventoryKey = `questboard_inventory_${userId}`;
            const inventory = localStorage.getItem(inventoryKey);
            return inventory ? JSON.parse(inventory) : [];
        } catch (error) {
            console.error('Error loading user inventory:', error);
            return [];
        }
    }

    /**
     * Save user inventory to localStorage
     */
    function saveUserInventory(userId, inventory) {
        try {
            const inventoryKey = `questboard_inventory_${userId}`;
            localStorage.setItem(inventoryKey, JSON.stringify(inventory));
        } catch (error) {
            console.error('Error saving user inventory:', error);
        }
    }

    /**
     * Get user's equipped avatar from user_stats
     */
    async function getEquippedAvatar(userId) {
        try {
            const { data, error } = await supabase
                .from('user_stats')
                .select('equipped_avatar')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return data?.equipped_avatar || null;
        } catch (error) {
            console.error('Error getting equipped avatar:', error);
            return null;
        }
    }

    /**
     * Purchase an item
     */
    async function purchaseItem(userId, itemId, userCoins) {
        try {
            const item = availableAvatars.find(a => a.id === itemId);
            if (!item) {
                throw new Error('Item not found');
            }

            // Check if user has enough coins
            if (userCoins < item.price) {
                throw new Error('Insufficient coins');
            }

            // Check if user already owns this item
            const userInventory = loadUserInventory(userId);
            const owned = userInventory.find(inv => inv.item_id === itemId);
            if (owned) {
                throw new Error('Item already owned');
            }

            // Update user coins in database
            const { data: userData, error: userError } = await supabase
                .from('user_stats')
                .update({ coins: userCoins - item.price })
                .eq('user_id', userId)
                .select();

            if (userError) throw userError;

            // Add item to localStorage inventory
            const newItem = {
                item_id: item.id,
                item_name: item.name,
                item_type: item.type,
                equipped: false,
                purchased_at: new Date().toISOString()
            };
            
            userInventory.push(newItem);
            saveUserInventory(userId, userInventory);

            return {
                success: true,
                newCoins: userData[0].coins,
                item: newItem
            };
        } catch (error) {
            console.error('Error purchasing item:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Equip an avatar
     */
    async function equipAvatar(userId, itemId) {
        try {
            // Update equipped avatar in user_stats
            const { data, error } = await supabase
                .from('user_stats')
                .update({ equipped_avatar: itemId })
                .eq('user_id', userId)
                .select();

            if (error) throw error;

            // Update local inventory
            const userInventory = loadUserInventory(userId);
            userInventory.forEach(item => {
                if (item.item_type === 'avatar') {
                    item.equipped = item.item_id === itemId;
                }
            });
            saveUserInventory(userId, userInventory);

            return { success: true, equippedAvatar: itemId };
        } catch (error) {
            console.error('Error equipping avatar:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Unequip an avatar
     */
    async function unequipAvatar(userId) {
        try {
            // Clear equipped avatar in user_stats
            const { data, error } = await supabase
                .from('user_stats')
                .update({ equipped_avatar: null })
                .eq('user_id', userId);

            if (error) throw error;

            // Update local inventory
            const userInventory = loadUserInventory(userId);
            userInventory.forEach(item => {
                if (item.item_type === 'avatar') {
                    item.equipped = false;
                }
            });
            saveUserInventory(userId, userInventory);

            return { success: true };
        } catch (error) {
            console.error('Error unequipping avatar:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Render shop modal content
     */
    async function renderShop(userId, userCoins) {
        const shopModal = document.getElementById('shopModal');
        const avatarGallery = document.getElementById('avatarGallery');
        const shopBalance = document.getElementById('shopCoinsBalance');

        if (!shopModal || !avatarGallery || !shopBalance) {
            console.error('Shop elements not found:', { shopModal, avatarGallery, shopBalance });
            return;
        }

        // Update balance display
        shopBalance.textContent = userCoins;

        // Load user inventory and equipped avatar
        const userInventory = loadUserInventory(userId);
        const equippedAvatarId = await getEquippedAvatar(userId);

        // Clear gallery
        avatarGallery.innerHTML = '';

        // Render each avatar
        availableAvatars.forEach(avatar => {
            const ownedItem = userInventory.find(inv => inv.item_id === avatar.id);
            const isOwned = !!ownedItem;
            const isEquipped = equippedAvatarId === avatar.id;

            const avatarElement = document.createElement('div');
            avatarElement.className = 'avatar-item';
            avatarElement.innerHTML = `
                <div class="avatar-preview">${avatar.image}</div>
                <div class="avatar-name">${avatar.name}</div>
                <div class="avatar-description">${avatar.description}</div>
                <div class="avatar-price">${avatar.price} coins</div>
                <div class="avatar-actions">
                    ${isOwned ? 
                        (isEquipped ? 
                            `<button class="avatar-btn equipped" disabled>Equipped</button>` :
                            `<button class="avatar-btn equip" data-item-id="${avatar.id}">Equip</button>`
                        ) :
                        `<button class="avatar-btn purchase" data-item-id="${avatar.id}" data-price="${avatar.price}">Purchase</button>`
                    }
                </div>
                ${isOwned ? '<div class="owned-badge">Owned</div>' : ''}
            `;

            avatarGallery.appendChild(avatarElement);
        });

        // Add event listeners for purchase and equip buttons
        addShopEventListeners(userId);
    }

    /**
     * Add event listeners for shop interactions
     */
    function addShopEventListeners(userId) {
        const avatarGallery = document.getElementById('avatarGallery');
        
        avatarGallery.addEventListener('click', async (e) => {
            if (e.target.classList.contains('purchase')) {
                const itemId = e.target.dataset.itemId;
                const price = parseInt(e.target.dataset.price);
                const currentCoins = parseInt(document.getElementById('shopCoinsBalance').textContent);
                
                const result = await purchaseItem(userId, itemId, currentCoins);
                
                if (result.success) {
                    // Update coins display
                    const shopBalance = document.getElementById('shopCoinsBalance');
                    const navbarCoins = document.getElementById('coinsCounter');
                    
                    if (shopBalance) shopBalance.textContent = result.newCoins;
                    if (navbarCoins) navbarCoins.textContent = result.newCoins;
                    
                    // Re-render shop to show updated state
                    await renderShop(userId, result.newCoins);
                    
                    // Show success message
                    showNotification('Avatar purchased successfully!', 'success');
                } else {
                    showNotification(result.error, 'error');
                }
            } else if (e.target.classList.contains('equip')) {
                const itemId = e.target.dataset.itemId;
                
                const result = await equipAvatar(userId, itemId);
                
                if (result.success) {
                    // Re-render shop to show updated state
                    const currentCoins = parseInt(document.getElementById('shopCoinsBalance').textContent);
                    await renderShop(userId, currentCoins);
                    
                    // Update profile avatar if visible
                    updateProfileAvatar(itemId);
                    
                    showNotification('Avatar equipped successfully!', 'success');
                } else {
                    showNotification(result.error, 'error');
                }
            }
        });
    }

    /**
     * Update profile avatar display
     */
    function updateProfileAvatar(itemId) {
        const avatar = availableAvatars.find(a => a.id === itemId);
        if (avatar) {
            const profileAvatar = document.querySelector('.profile-avatar');
            if (profileAvatar) {
                profileAvatar.textContent = avatar.image;
            }
        }
    }

    /**
     * Show notification message
     */
    function showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;

        if (type === 'success') {
            notification.style.backgroundColor = '#10b981';
        } else if (type === 'error') {
            notification.style.backgroundColor = '#ef4444';
        } else {
            notification.style.backgroundColor = '#3b82f6';
        }

        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    // Initialize avatars on module load
    initializeAvatars();

    // Return public API
    return {
        renderShop,
        purchaseItem,
        equipAvatar,
        unequipAvatar,
        loadUserInventory,
        getEquippedAvatar,
        availableAvatars
    };
}