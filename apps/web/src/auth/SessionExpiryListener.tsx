import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useI18n } from '../i18n/i18nContext';
import { SESSION_EXPIRED_EVENT } from '../lib/services';
import { useServices } from '../lib/servicesContext';

/** The API refused the refresh token: back to the login, saying why. */
export function SessionExpiryListener() {
  const { events } = useServices();
  const navigate = useNavigate();
  const { t } = useI18n();
  useEffect(() => {
    const onExpired = () => {
      toast.error(t('errors.SESSION_EXPIRED'), { id: SESSION_EXPIRED_EVENT });
      navigate('/entrar', { replace: true });
    };
    events.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => events.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [events, navigate, t]);
  return null;
}
