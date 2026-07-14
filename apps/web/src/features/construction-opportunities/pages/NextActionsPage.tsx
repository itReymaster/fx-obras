import { useState, useEffect } from 'react';
import { opportunitiesApi } from '../services/opportunities-api';
import { useNavigate } from 'react-router-dom';
import '../styles/next-actions-timeline.css';

interface ActionItem {
  id: string;
  opportunityId: string;
  opportunityTitle: string;
  nextAction?: string;
  nextActionDate?: string;
  status: 'overdue' | 'today' | 'upcoming';
  commercialPotential: string;
  street?: string;
}

export const NextActionsPage = () => {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadActions();
  }, []);

  const loadActions = async () => {
    try {
      setIsLoading(true);
      const response = await opportunitiesApi.list({
        page: 1,
        pageSize: 100,
        sortBy: 'nextActionDate',
      });

      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const processedActions: ActionItem[] = response.data
        .filter((opp: any) => opp.nextActionDate && opp.nextAction)
        .map((opp: any) => {
          const actionDate = new Date(opp.nextActionDate);
          actionDate.setHours(0, 0, 0, 0);

          let status: 'overdue' | 'today' | 'upcoming' = 'upcoming';
          if (actionDate < now) status = 'overdue';
          else if (actionDate.getTime() === now.getTime()) status = 'today';

          return {
            id: opp.id,
            opportunityId: opp.id,
            opportunityTitle: opp.title,
            nextAction: opp.nextAction,
            nextActionDate: opp.nextActionDate,
            status,
            commercialPotential: opp.commercialPotential || 'NOT_EVALUATED',
            street: opp.street,
          };
        })
        .sort((a: ActionItem, b: ActionItem) => {
          const dateA = new Date(a.nextActionDate || '').getTime();
          const dateB = new Date(b.nextActionDate || '').getTime();
          return dateA - dateB;
        });

      setActions(processedActions);
    } catch (error) {
      console.error('Erro ao carregar ações:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getDaysFromNow = (dateStr: string | undefined) => {
    if (!dateStr) return null;
    const actionDate = new Date(dateStr);
    const now = new Date();
    const diffTime = actionDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusLabel = (status: 'overdue' | 'today' | 'upcoming', daysFromNow?: number | null) => {
    if (status === 'overdue') return `Vencida há ${Math.abs(daysFromNow || 0)} dias`;
    if (status === 'today') return 'Ação de hoje';
    if (daysFromNow && daysFromNow === 1) return 'Amanhã';
    if (daysFromNow && daysFromNow <= 7) return `${daysFromNow} dias`;
    return 'Próxima';
  };

  const potentialColors: Record<string, string> = {
    HIGH: '#10b981',
    MEDIUM: '#f59e0b',
    LOW: '#ef4444',
    NOT_EVALUATED: '#6b7280',
  };

  const groupedActions = {
    overdue: actions.filter((a) => a.status === 'overdue'),
    today: actions.filter((a) => a.status === 'today'),
    upcoming: actions.filter((a) => a.status === 'upcoming'),
  };

  return (
    <div className="next-actions-page">
      <div className="page-header">
        <h2>Linha do Tempo de Ações</h2>
        <p>Acompanhamento estratégico de próximas ações por obra</p>
      </div>

      {isLoading ? (
        <div className="loading">Carregando ações...</div>
      ) : (
        <div className="timeline-container">
          {/* Ações Vencidas */}
          {groupedActions.overdue.length > 0 && (
            <div className="timeline-section overdue">
              <div className="section-header">
                <div className="status-badge overdue">⚠️ Vencidas ({groupedActions.overdue.length})</div>
                <p className="section-description">Ações que ultrapassaram a data programada</p>
              </div>
              <div className="actions-list">
                {groupedActions.overdue.map((action) => (
                  <div
                    key={action.id}
                    className="action-card overdue"
                    onClick={() => navigate(`/opportunities/${action.opportunityId}`)}
                  >
                    <div className="action-left">
                      <div className="potential-indicator" style={{ backgroundColor: potentialColors[action.commercialPotential] }}></div>
                      <div className="action-content">
                        <h4>{action.opportunityTitle}</h4>
                        <p className="action-description">{action.nextAction}</p>
                        <p className="action-address">{action.street}</p>
                      </div>
                    </div>
                    <div className="action-right">
                      <div className="action-date-badge overdue">{formatDate(action.nextActionDate)}</div>
                      <div className="action-status">{getStatusLabel(action.status, getDaysFromNow(action.nextActionDate))}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ações de Hoje */}
          {groupedActions.today.length > 0 && (
            <div className="timeline-section today">
              <div className="section-header">
                <div className="status-badge today">📍 Hoje ({groupedActions.today.length})</div>
                <p className="section-description">Ações programadas para hoje</p>
              </div>
              <div className="actions-list">
                {groupedActions.today.map((action) => (
                  <div
                    key={action.id}
                    className="action-card today"
                    onClick={() => navigate(`/opportunities/${action.opportunityId}`)}
                  >
                    <div className="action-left">
                      <div className="potential-indicator" style={{ backgroundColor: potentialColors[action.commercialPotential] }}></div>
                      <div className="action-content">
                        <h4>{action.opportunityTitle}</h4>
                        <p className="action-description">{action.nextAction}</p>
                        <p className="action-address">{action.street}</p>
                      </div>
                    </div>
                    <div className="action-right">
                      <div className="action-date-badge today">{formatDate(action.nextActionDate)}</div>
                      <div className="action-status">{getStatusLabel(action.status)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Próximas Ações */}
          {groupedActions.upcoming.length > 0 && (
            <div className="timeline-section upcoming">
              <div className="section-header">
                <div className="status-badge upcoming">📅 Próximas Ações ({groupedActions.upcoming.length})</div>
                <p className="section-description">Ações futuras - estratégia de acompanhamento</p>
              </div>
              <div className="actions-list">
                {groupedActions.upcoming.map((action) => (
                  <div
                    key={action.id}
                    className="action-card upcoming"
                    onClick={() => navigate(`/opportunities/${action.opportunityId}`)}
                  >
                    <div className="action-left">
                      <div className="potential-indicator" style={{ backgroundColor: potentialColors[action.commercialPotential] }}></div>
                      <div className="action-content">
                        <h4>{action.opportunityTitle}</h4>
                        <p className="action-description">{action.nextAction}</p>
                        <p className="action-address">{action.street}</p>
                      </div>
                    </div>
                    <div className="action-right">
                      <div className="action-date-badge upcoming">{formatDate(action.nextActionDate)}</div>
                      <div className="action-status">{getStatusLabel(action.status, getDaysFromNow(action.nextActionDate))}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sem ações */}
          {actions.length === 0 && (
            <div className="empty-state">
              <p>📭 Nenhuma ação programada</p>
              <p>Comece adicionando próximas ações nos registros de obras</p>
            </div>
          )}

          {/* Stats */}
          <div className="timeline-stats">
            <div className="stat-card">
              <span className="stat-number">{groupedActions.overdue.length}</span>
              <span className="stat-label">Vencidas</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{groupedActions.today.length}</span>
              <span className="stat-label">Hoje</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{groupedActions.upcoming.length}</span>
              <span className="stat-label">Próximas</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{actions.length}</span>
              <span className="stat-label">Total</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
