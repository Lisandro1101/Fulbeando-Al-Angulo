export interface DashboardSummary {
  users: {
    total: number;
    activeLast7Days: number;
    newThisWeek: number;
  };
  teams: {
    complete: number; // 5 o más
    incomplete: number;
  };
  matches: {
    played: number;
    pendingValidation: number; // pending_approval
    disputed: number; // apelados
    canceled: number;
  };
  venues: {
    active: number;
    trial: number;
    pastDue: number;
  };
  lastUpdated: number;
}

export interface DisputedMatch {
  id: string;
  localTeamName: string;
  visitorTeamName: string;
  localScoreClaim: number;
  visitorScoreClaim: number;
  disputeReason: string;
  chatRoomId: string;
  date: number;
}
