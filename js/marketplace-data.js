// Shared Marketplace Data
const MOCK_LISTINGS = [
    {
        id: 'item-1',
        title: 'Ceramic Vase (Hand-painted)',
        category: 'Furniture',
        price: 150,
        condition: 'Like New',
        images: ['../../images/ceramic-vase.png'],
        seller: { id: 'demo-ankush', name: 'Ankush Jha', campus: 'ReLoop Campus' },
        description: 'Beautiful ceramic vase, perfect for flowers or shelf decor.'
    },
    {
        id: 'item-2',
        title: 'Minimalist Desk Lamp',
        category: 'Furniture',
        price: 85,
        condition: 'Good',
        images: ['../../images/desk-lamp.png'],
        seller: { id: 'user-2', name: 'Unnati Asthana', campus: 'East Wing' },
        description: 'Warm light lamp, great for studying.'
    },
    {
        id: 'item-3',
        title: 'Data Structures & Algorithms',
        category: 'Books',
        price: 45,
        condition: 'Used',
        images: ['../../images/study-books.png'],
        seller: { id: 'demo-ankush', name: 'Ankush Jha', campus: 'ReLoop Campus' },
        description: 'The definitive guide. Some highlighting inside.'
    },
    {
        id: 'item-4',
        title: 'Noise Cancelling Headphones',
        category: 'Electronics',
        price: 220,
        condition: 'Fair',
        images: ['../../images/headphones.png'],
        seller: { id: 'user-3', name: 'Uransh', campus: 'North Quad' },
        description: 'Great sound, slightly worn pads.'
    },
    {
        id: 'item-5',
        title: 'Stainless Electric Kettle',
        category: 'Kitchen',
        price: 60,
        condition: 'New',
        images: ['../../images/electric-kettle.png'],
        seller: { id: 'user-4', name: 'Rudrakh Bairagi', campus: 'West Block' },
        description: 'Brand new, never used. 1.5L capacity.'
    },
    {
        id: 'item-6',
        title: 'High-speed USB-C Charger',
        category: 'Electronics',
        price: 25,
        condition: 'Like New',
        images: ['../../images/phone-charger.png'],
        seller: { id: 'user-5', name: 'GreenQueen', campus: 'ReLoop Campus' },
        description: 'Fast charging for all your devices.'
    }
];

// Verify if global scope or module
if (typeof window !== 'undefined') {
    window.MOCK_LISTINGS = MOCK_LISTINGS;
}

