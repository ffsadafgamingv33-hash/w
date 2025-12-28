
import { 
  User, UserRole, Item, ItemType, Purchase, Transaction, 
  TransactionStatus, RedeemCode, Ticket, TicketStatus, TicketMessage, SequentialItem 
} from './types';

// Simple persistence using LocalStorage
const STORAGE_KEY = 'ebon_shop_db';

interface DBState {
  users: User[];
  items: Item[];
  purchases: Purchase[];
  transactions: Transaction[];
  redeemCodes: RedeemCode[];
  tickets: Ticket[];
}

const getInitialState = (): DBState => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return JSON.parse(stored);
  return {
    users: [],
    items: [],
    purchases: [],
    transactions: [],
    redeemCodes: [],
    tickets: []
  };
};

const saveState = (state: DBState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const DB = {
  // Users
  getUsers: () => getInitialState().users,
  addUser: (user: User) => {
    const state = getInitialState();
    state.users.push(user);
    saveState(state);
  },
  // Added verifyUser method to fix the error in VerifyEmail.tsx
  verifyUser: (token: string): { success: boolean; error?: string } => {
    // Mock implementation for verification protocol. In a production app, tokens would be checked against the database.
    if (token && token.length > 0) {
      return { success: true };
    }
    return { success: false, error: 'Invalid or expired verification token' };
  },
  updateUserCredits: (userId: string, amount: number) => {
    const state = getInitialState();
    const user = state.users.find(u => u.id === userId);
    if (user) user.credits += amount;
    saveState(state);
  },

  // Items
  getItems: () => getInitialState().items,
  addItem: (item: Item) => {
    const state = getInitialState();
    state.items.push(item);
    saveState(state);
  },
  updateItem: (item: Item) => {
    const state = getInitialState();
    const index = state.items.findIndex(i => i.id === item.id);
    if (index !== -1) {
      state.items[index] = item;
      saveState(state);
      return true;
    }
    return false;
  },
  deleteItem: (itemId: string) => {
    const state = getInitialState();
    state.items = state.items.filter(i => i.id !== itemId);
    saveState(state);
  },

  // Purchases
  getPurchases: () => getInitialState().purchases,
  addPurchase: (purchase: Purchase) => {
    const state = getInitialState();
    state.purchases.push(purchase);
    saveState(state);
  },
  processPurchase: (userId: string, itemId: string): { success: boolean, content?: string, error?: string } => {
    const state = getInitialState();
    const user = state.users.find(u => u.id === userId);
    const item = state.items.find(i => i.id === itemId);

    if (!user || !item) return { success: false, error: 'User or Item not found' };
    if (user.credits < item.price) return { success: false, error: 'Insufficient credits' };

    let content = '';
    if (item.type === ItemType.INSTANT) {
      content = item.content || '';
    } else {
      const available = item.sequentialItems?.find(si => !si.isDelivered);
      if (!available) return { success: false, error: 'Out of stock' };
      content = available.content;
      available.isDelivered = true;
      item.deliveredCount++;
    }

    user.credits -= item.price;
    const purchase: Purchase = {
      id: Math.random().toString(36).substring(7),
      userId,
      itemId,
      itemName: item.name,
      contentDelivered: content,
      timestamp: Date.now(),
      price: item.price
    };
    state.purchases.push(purchase);
    saveState(state);
    return { success: true, content };
  },

  // Transactions
  getTransactions: () => getInitialState().transactions,
  addTransaction: (transaction: Transaction) => {
    const state = getInitialState();
    state.transactions.push(transaction);
    saveState(state);
  },
  updateTransactionStatus: (id: string, status: TransactionStatus) => {
    const state = getInitialState();
    const tx = state.transactions.find(t => t.id === id);
    if (tx) {
      tx.status = status;
      if (status === TransactionStatus.APPROVED) {
        const user = state.users.find(u => u.id === tx.userId);
        if (user) user.credits += tx.amount;
      }
    }
    saveState(state);
  },

  // Redeem Codes
  getRedeemCodes: () => getInitialState().redeemCodes,
  addRedeemCode: (code: RedeemCode) => {
    const state = getInitialState();
    state.redeemCodes.push(code);
    saveState(state);
  },
  redeem: (userId: string, codeStr: string): { success: boolean, amount?: number, error?: string } => {
    const state = getInitialState();
    const user = state.users.find(u => u.id === userId);
    if (!user) return { success: false, error: 'User not found' };

    const code = state.redeemCodes.find(c => c.code === codeStr && !c.isUsed);
    if (!code) return { success: false, error: 'Invalid or already used code' };
    
    code.isUsed = true;
    user.credits += code.amount;
    saveState(state);
    return { success: true, amount: code.amount };
  },

  // Tickets
  getTickets: () => getInitialState().tickets,
  createTicket: (ticket: Ticket) => {
    const state = getInitialState();
    state.tickets.push(ticket);
    saveState(state);
  },
  addTicketMessage: (ticketId: string, message: TicketMessage) => {
    const state = getInitialState();
    const ticket = state.tickets.find(t => t.id === ticketId);
    if (ticket) {
      ticket.messages.push(message);
      ticket.lastUpdated = Date.now();
    }
    saveState(state);
  },
  closeTicket: (ticketId: string) => {
    const state = getInitialState();
    const ticket = state.tickets.find(t => t.id === ticketId);
    if (ticket) {
      ticket.status = TicketStatus.CLOSED;
      ticket.lastUpdated = Date.now();
    }
    saveState(state);
  }
};
