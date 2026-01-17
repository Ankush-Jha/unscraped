// Database Service for ReLoop
// Handles Firestore operations for listings, trades, and users

const DatabaseService = {
    // ============ LISTINGS ============

    // Create a new listing
    async createListing(data) {
        const userId = getCurrentUserId();
        if (!userId) return { success: false, error: 'Not authenticated' };

        try {
            const listing = {
                sellerId: userId,
                title: data.title,
                description: data.description || '',
                category: data.category,
                condition: data.condition,
                price: parseInt(data.price),
                images: data.images || [],
                status: 'available',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
            };

            const docRef = await db.collection('listings').add(listing);

            // Track mission progress for listing
            if (typeof GamificationService !== 'undefined') {
                GamificationService.updateMissionProgress(userId, 'list_item', 1);
                GamificationService.checkAndAwardBadges(userId);
            }

            return { success: true, id: docRef.id };
        } catch (error) {
            console.error('Error creating listing:', error);
            return { success: false, error: error.message };
        }
    },

    // Get all available listings
    async getListings(options = {}) {
        try {
            let query = db.collection('listings')
                .where('status', '==', 'available')
                .orderBy('createdAt', 'desc');

            // Category filter
            if (options.category && options.category !== 'All') {
                query = query.where('category', '==', options.category);
            }

            // Limit
            if (options.limit) {
                query = query.limit(options.limit);
            }

            const snapshot = await query.get();

            // Map docs to initial objects
            const initialListings = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Extract unique seller IDs
            const sellerIds = [...new Set(initialListings.map(l => l.sellerId).filter(Boolean))];

            // Fetch sellers in parallel
            const sellerPromises = sellerIds.map(id =>
                db.collection('users').doc(id).get()
                    .then(doc => ({ id, data: doc.exists ? doc.data() : null }))
                    .catch(() => ({ id, data: null }))
            );

            const sellersData = await Promise.all(sellerPromises);

            // Create a map for fast lookup
            const sellerMap = {};
            sellersData.forEach(item => {
                if (item.data) {
                    sellerMap[item.id] = {
                        name: item.data.name || 'Unknown',
                        avatar: item.data.avatar,
                        campus: item.data.campus
                    };
                } else {
                    sellerMap[item.id] = { name: 'Unknown' };
                }
            });

            // Hydrate listings with seller info
            return initialListings.map(listing => ({
                ...listing,
                seller: {
                    id: listing.sellerId,
                    ...sellerMap[listing.sellerId]
                }
            }));
        } catch (error) {
            console.error('Error getting listings:', error);
            return [];
        }
    },

    // Get a single listing by ID
    async getListing(listingId) {
        try {
            const doc = await db.collection('listings').doc(listingId).get();
            if (!doc.exists) return null;

            const data = doc.data();

            // Get seller info
            const sellerDoc = await db.collection('users').doc(data.sellerId).get();
            const seller = sellerDoc.exists ? sellerDoc.data() : { name: 'Unknown' };

            return {
                id: doc.id,
                ...data,
                seller: { id: data.sellerId, name: seller.name, avatar: seller.avatar, campus: seller.campus }
            };
        } catch (error) {
            console.error('Error getting listing:', error);
            return null;
        }
    },

    // Update listing status
    async updateListingStatus(listingId, status) {
        try {
            await db.collection('listings').doc(listingId).update({ status });
            return { success: true };
        } catch (error) {
            console.error('Error updating listing:', error);
            return { success: false, error: error.message };
        }
    },

    // Get user's listings
    async getUserListings(userId) {
        try {
            const snapshot = await db.collection('listings')
                .where('sellerId', '==', userId)
                .orderBy('createdAt', 'desc')
                .get();

            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error getting user listings:', error);
            return [];
        }
    },

    // ============ TRADES ============

    // Create a trade request
    async createTradeRequest(listingId, sellerId) {
        const buyerId = getCurrentUserId();
        console.log('[Trade] Starting trade request:', { listingId, sellerId, buyerId });

        if (!buyerId) {
            console.error('[Trade] Error: User not authenticated');
            return { success: false, error: 'Not authenticated' };
        }

        if (buyerId === sellerId) {
            console.error('[Trade] Error: Cannot trade with yourself');
            return { success: false, error: 'Cannot trade your own item' };
        }

        try {
            const trade = {
                listingId,
                buyerId,
                sellerId,
                status: 'pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            console.log('[Trade] Creating trade document...');
            const docRef = await db.collection('trades').add(trade);
            console.log('[Trade] Trade created with ID:', docRef.id);

            // Update listing status
            console.log('[Trade] Updating listing status to pending...');
            await db.collection('listings').doc(listingId).update({ status: 'pending' });

            // Create a conversation
            console.log('[Trade] Creating conversation...');
            const convResult = await this.createConversation(buyerId, sellerId, listingId);
            console.log('[Trade] Conversation result:', convResult);

            if (!convResult.success) {
                console.error('[Trade] Failed to create conversation:', convResult.error);
            }

            return {
                success: true,
                id: docRef.id,
                conversationId: convResult.id
            };
        } catch (error) {
            console.error('[Trade] Error creating trade:', error);
            // More detailed error for debugging
            if (error.code) console.error('[Trade] Error Code:', error.code);
            return { success: false, error: 'Failed to create trade: ' + error.message };
        }
    },

    // Accept a trade
    async acceptTrade(tradeId) {
        try {
            const tradeDoc = await db.collection('trades').doc(tradeId).get();
            if (!tradeDoc.exists) return { success: false, error: 'Trade not found' };

            const trade = tradeDoc.data();
            const listingDoc = await db.collection('listings').doc(trade.listingId).get();
            const listing = listingDoc.data();

            // Transfer coins
            const buyerRef = db.collection('users').doc(trade.buyerId);
            const sellerRef = db.collection('users').doc(trade.sellerId);

            await db.runTransaction(async (transaction) => {
                const buyerDoc = await transaction.get(buyerRef);
                const sellerDoc = await transaction.get(sellerRef);

                if (!buyerDoc.exists) throw new Error('Buyer profile not found');
                if (!sellerDoc.exists) throw new Error('Seller profile not found');

                const buyerData = buyerDoc.data();
                const sellerData = sellerDoc.data();

                const buyerCoins = buyerData.coins || 0;
                const sellerCoins = sellerData.coins || 0;

                if (buyerCoins < listing.price) {
                    throw new Error(`Insufficient coins (Has: ${buyerCoins}, Needed: ${listing.price})`);
                }

                // Update buyer coins and stats
                transaction.update(buyerRef, {
                    coins: buyerCoins - listing.price,
                    itemsTraded: firebase.firestore.FieldValue.increment(1)
                });

                // Update seller coins and stats
                transaction.update(sellerRef, {
                    coins: sellerCoins + listing.price,
                    itemsTraded: firebase.firestore.FieldValue.increment(1),
                    co2Saved: firebase.firestore.FieldValue.increment(2.5) // Estimated CO2 per item
                });

                // Update trade status
                transaction.update(db.collection('trades').doc(tradeId), { status: 'completed' });

                // Update listing status
                transaction.update(db.collection('listings').doc(trade.listingId), { status: 'sold' });
            });

            // Track mission progress for completing trade
            if (typeof GamificationService !== 'undefined') {
                GamificationService.updateMissionProgress(trade.buyerId, 'complete_trade', 1);
                GamificationService.updateMissionProgress(trade.sellerId, 'complete_trade', 1);
                GamificationService.checkAndAwardBadges(trade.buyerId);
                GamificationService.checkAndAwardBadges(trade.sellerId);
            }

            return { success: true };
        } catch (error) {
            console.error('Error accepting trade:', error);
            return { success: false, error: error.message };
        }
    },

    // Reject a trade
    async rejectTrade(tradeId) {
        try {
            const tradeDoc = await db.collection('trades').doc(tradeId).get();
            const trade = tradeDoc.data();

            await db.collection('trades').doc(tradeId).update({ status: 'rejected' });
            await db.collection('listings').doc(trade.listingId).update({ status: 'available' });

            return { success: true };
        } catch (error) {
            console.error('Error rejecting trade:', error);
            return { success: false, error: error.message };
        }
    },

    // Get user's trades
    async getUserTrades(userId) {
        try {
            // Get trades where user is buyer or seller
            const buyerTrades = await db.collection('trades')
                .where('buyerId', '==', userId)
                .orderBy('createdAt', 'desc')
                .get();

            const sellerTrades = await db.collection('trades')
                .where('sellerId', '==', userId)
                .orderBy('createdAt', 'desc')
                .get();

            const trades = [];

            for (const doc of [...buyerTrades.docs, ...sellerTrades.docs]) {
                const data = doc.data();
                const listingDoc = await db.collection('listings').doc(data.listingId).get();

                trades.push({
                    id: doc.id,
                    ...data,
                    listing: listingDoc.exists ? listingDoc.data() : null,
                    role: data.buyerId === userId ? 'buyer' : 'seller'
                });
            }

            return trades;
        } catch (error) {
            console.error('Error getting user trades:', error);
            return [];
        }
    },

    // ============ CONVERSATIONS / MESSAGES ============

    // Create or get conversation
    async createConversation(buyerId, sellerId, listingId) {
        console.log('[Conversation] Creating conversation:', { buyerId, sellerId, listingId });

        try {
            // Check if conversation exists
            console.log('[Conversation] Checking for existing conversation...');
            const existing = await db.collection('conversations')
                .where('participants', 'array-contains', buyerId)
                .get();

            console.log('[Conversation] Found', existing.docs.length, 'conversations with buyer');

            for (const doc of existing.docs) {
                const data = doc.data();
                if (data.participants.includes(sellerId) && data.listingId === listingId) {
                    console.log('[Conversation] Found existing conversation:', doc.id);
                    return { success: true, id: doc.id, existing: true };
                }
            }

            // Create new conversation with buyer/seller tracking
            const conversation = {
                participants: [buyerId, sellerId],
                buyerId,
                sellerId,
                listingId,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastMessage: 'Trade request sent!',
                lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            console.log('[Conversation] Creating new conversation document...');
            const docRef = await db.collection('conversations').add(conversation);
            console.log('[Conversation] Created conversation with ID:', docRef.id);

            // Also send an initial system message
            console.log('[Conversation] Adding initial message...');
            await db.collection('conversations').doc(docRef.id)
                .collection('messages').add({
                    senderId: buyerId,
                    text: '👋 Hi! I\'m interested in trading for this item!',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    isSystem: false
                });
            console.log('[Conversation] Initial message added');

            return { success: true, id: docRef.id, existing: false };
        } catch (error) {
            console.error('[Conversation] Error creating conversation:', error);
            return { success: false, error: error.message };
        }
    },

    // Get user's conversations with role info (buying or selling)
    async getConversations(filter = 'all') {
        const userId = getCurrentUserId();
        console.log('[GetConversations] Starting with filter:', filter, 'userId:', userId);

        if (!userId) {
            console.warn('[GetConversations] No user ID, returning empty array');
            return [];
        }

        try {
            console.log('[GetConversations] Querying conversations collection...');
            const snapshot = await db.collection('conversations')
                .where('participants', 'array-contains', userId)
                .orderBy('lastMessageAt', 'desc')
                .get();

            console.log('[GetConversations] Found', snapshot.docs.length, 'conversations');
            const conversations = [];

            for (const doc of snapshot.docs) {
                const data = doc.data();
                console.log('[GetConversations] Processing conversation:', doc.id, data);

                const otherUserId = data.participants.find(id => id !== userId);
                const otherUserDoc = await db.collection('users').doc(otherUserId).get();
                const otherUser = otherUserDoc.exists ? otherUserDoc.data() : { name: 'Unknown User' };

                // Determine role: if current user is buyer, they're "buying"; if seller, they're "selling"
                const role = data.buyerId === userId ? 'buying' : 'selling';

                // Get listing info if available
                let listing = null;
                if (data.listingId) {
                    const listingDoc = await db.collection('listings').doc(data.listingId).get();
                    listing = listingDoc.exists ? { id: listingDoc.id, ...listingDoc.data() } : null;
                }

                // Apply filter
                if (filter !== 'all' && role !== filter) {
                    console.log('[GetConversations] Skipping due to filter');
                    continue;
                }

                conversations.push({
                    id: doc.id,
                    ...data,
                    role,
                    listing,
                    otherUser: { id: otherUserId, name: otherUser.name, avatar: otherUser.avatar }
                });
            }

            console.log('[GetConversations] Returning', conversations.length, 'conversations');
            return conversations;
        } catch (error) {
            console.error('[GetConversations] Error:', error);
            // Check if it's an index error
            if (error.code === 'failed-precondition' || error.message?.includes('index')) {
                console.error('[GetConversations] This error may require a Firestore composite index.');
                console.error('[GetConversations] Create an index for: conversations (participants, lastMessageAt)');
            }
            return [];

        }
    },

    // Send a message
    async sendMessage(conversationId, text) {
        const userId = getCurrentUserId();
        if (!userId) return { success: false, error: 'Not authenticated' };

        try {
            const message = {
                senderId: userId,
                text,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await db.collection('conversations').doc(conversationId)
                .collection('messages').add(message);

            // Update conversation last message
            await db.collection('conversations').doc(conversationId).update({
                lastMessage: text,
                lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Track mission progress for sending message
            if (typeof GamificationService !== 'undefined') {
                GamificationService.updateMissionProgress(userId, 'send_message', 1);
            }

            return { success: true };
        } catch (error) {
            console.error('Error sending message:', error);
            return { success: false, error: error.message };
        }
    },

    // Get messages for a conversation (real-time listener)
    subscribeToMessages(conversationId, callback) {
        return db.collection('conversations').doc(conversationId)
            .collection('messages')
            .orderBy('createdAt', 'asc')
            .onSnapshot((snapshot) => {
                const messages = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                callback(messages);
            });
    },

    // ============ LEADERBOARD ============

    // Get campus leaderboard
    async getLeaderboard(campus = null, limit = 10) {
        try {
            let query = db.collection('users')
                .orderBy('xp', 'desc')
                .limit(limit);

            if (campus) {
                query = query.where('campus', '==', campus);
            }

            const snapshot = await query.get();
            return snapshot.docs.map((doc, index) => ({
                rank: index + 1,
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting leaderboard:', error);
            return [];
        }
    },

    // ============ COINS ============

    // Get user coins
    async getUserCoins() {
        const userId = getCurrentUserId();
        if (!userId) return 0;

        try {
            const doc = await db.collection('users').doc(userId).get();
            if (doc.exists) {
                const coins = doc.data().coins || 0;
                localStorage.setItem('reloop_coins', coins);
                return coins;
            }
            return 0;
        } catch (error) {
            console.error('Error getting coins:', error);
            return parseInt(localStorage.getItem('reloop_coins')) || 0;
        }
    },

    // Add coins to user (for missions, achievements)
    async addCoins(amount, reason = '') {
        const userId = getCurrentUserId();
        if (!userId) return { success: false };

        try {
            await db.collection('users').doc(userId).update({
                coins: firebase.firestore.FieldValue.increment(amount),
                xp: firebase.firestore.FieldValue.increment(Math.floor(amount / 2))
            });
            return { success: true };
        } catch (error) {
            console.error('Error adding coins:', error);
            return { success: false, error: error.message };
        }
    }
};
