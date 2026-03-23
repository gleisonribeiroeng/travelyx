export type CollaboratorRole = 'OWNER' | 'EDITOR' | 'VIEWER';

export interface Collaborator {
  id: string;
  userId: string;
  name: string;
  email: string;
  picture: string;
  role: CollaboratorRole;
  joinedAt: string;
}

export interface TripInvite {
  id: string;
  tripId: string;
  tripName: string;
  email: string;
  role: CollaboratorRole;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  invitedBy: { name: string; picture: string };
  expiresAt: string;
  token: string;
}

export interface TripComment {
  id: string;
  userId: string;
  userName: string;
  userPicture: string;
  targetType: string;
  targetId: string;
  content: string;
  reactions: Record<string, string[]>; // emoji -> userIds
  createdAt: string;
  replies?: TripComment[];
}

export interface TripPoll {
  id: string;
  question: string;
  createdBy: { name: string; picture: string };
  options: TripPollOption[];
  closedAt: string | null;
  createdAt: string;
}

export interface TripPollOption {
  id: string;
  label: string;
  voteCount: number;
  votedByMe: boolean;
}

export interface TripActivity {
  id: string;
  userId: string;
  userName: string;
  userPicture: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: any;
  createdAt: string;
}

export interface ExpenseSplit {
  id: string;
  label: string;
  totalAmount: number;
  currency: string;
  splitMode: 'EQUAL' | 'PROPORTIONAL' | 'SINGLE_PAYER';
  date: string;
  entries: ExpenseSplitEntry[];
  createdBy: { name: string; picture: string };
}

export interface ExpenseSplitEntry {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  isPaid: boolean;
}

export interface UserBalance {
  userId: string;
  userName: string;
  userPicture: string;
  totalPaid: number;
  totalOwed: number;
  balance: number; // positive = others owe them, negative = they owe
}

export interface Settlement {
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  amount: number;
}

export interface CollabNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}
