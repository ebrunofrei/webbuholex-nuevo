'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from './admin-complaints-list.module.css';

type ComplaintStatus = 'received' | 'under_review' | 'awaiting_information' | 'answered' | 'closed';

interface ComplaintItem {
  complaintId: string;
  sheetNumber: string;
  status: ComplaintStatus;
  submittedAt: string;
  deadlineAt: string;
  updatedAt: string;
}

interface FetchResponse {
  items?: ComplaintItem[];
  nextCursor?: string;
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'received', label: 'Recibido' },
  { value: 'under_review', label: 'En revisión' },
  { value: 'awaiting_information', label: 'Esperando información' },
  { value: 'answered', label: 'Respondido' },
  { value: 'closed', label: 'Cerrado' },
];

const isValidStatus = (status: string | null): status is ComplaintStatus => {
  if (!status) return false;
  return STATUS_OPTIONS.some(opt => opt.value === status && status !== 'all');
};

const getStatusLabel = (status: ComplaintStatus): string => {
  return STATUS_OPTIONS.find(opt => opt.value === status)?.label || status;
};

export function AdminComplaintsList() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialUrlStatus = searchParams.get('status');
  const [statusFilter, setStatusFilter] = useState<string>(() => {
    return isValidStatus(initialUrlStatus) ? initialUrlStatus : 'all';
  });

  const [items, setItems] = useState<ComplaintItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<{ status?: number; message: string } | null>(null);
  const [isAppending, setIsAppending] = useState<boolean>(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef<boolean>(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const fetchComplaints = useCallback(async (
    filterValue: string,
    cursorValue: string | null,
    isLoadMore: boolean = false
  ) => {
    if (!mountedRef.current) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      if (isLoadMore) {
        setIsAppending(true);
      } else {
        setLoading(true);
        setError(null);
      }

      const params = new URLSearchParams();
      params.set('limit', '20');
      if (filterValue !== 'all') {
        params.set('status', filterValue);
      }
      if (cursorValue) {
        params.set('cursor', cursorValue);
      }

      const res = await fetch(`/api/admin/complaints?${params.toString()}`, {
        method: 'GET',
        credentials: 'same-origin',
        signal: controller.signal,
      });

      if (!res.ok) {
        let errorMessage = 'Ocurrió un error al cargar los reclamos.';
        if (res.status === 401) {
          errorMessage = 'La sesión ha expirado.';
        } else if (res.status === 403) {
          errorMessage = 'No tienes permiso para ver esta sección.';
        } else if (res.status === 503) {
          errorMessage = 'El servicio no está disponible temporalmente. Por favor, intenta de nuevo más tarde.';
        }
        throw { status: res.status, message: errorMessage };
      }

      const data: FetchResponse = await res.json();

      if (!data || !Array.isArray(data.items)) {
        throw new Error('La respuesta del servidor no tiene el formato esperado.');
      }

      if (!mountedRef.current || controller.signal.aborted) return;

      if (isLoadMore) {
        setItems(prev => {
          const newItems = data.items!.filter(
            newItem => !prev.some(prevItem => prevItem.complaintId === newItem.complaintId)
          );
          return [...prev, ...newItems];
        });
      } else {
        setItems(data.items!);
      }

      setNextCursor(data.nextCursor || null);

    } catch (err) {
      const errorObj = err as { name?: string; status?: number; message?: string };
      if (errorObj.name === 'AbortError') return;
      if (!mountedRef.current) return;

      setError({
        ...(errorObj.status !== undefined && { status: errorObj.status }),
        message: errorObj.message || 'Ocurrió un error al cargar los reclamos.'
      });
    } finally {
      if (mountedRef.current && !controller.signal.aborted) {
        setLoading(false);
        setIsAppending(false);
      }
    }
  }, []);

  useEffect(() => {
    const currentParams = new URLSearchParams(window.location.search);
    const currentStatus = currentParams.get('status');
    let shouldUpdateUrl = false;

    if (statusFilter === 'all' && currentStatus !== null) {
      currentParams.delete('status');
      shouldUpdateUrl = true;
    } else if (statusFilter !== 'all' && currentStatus !== statusFilter) {
      currentParams.set('status', statusFilter);
      shouldUpdateUrl = true;
    }

    if (shouldUpdateUrl) {
      const searchStr = currentParams.toString();
      const query = searchStr ? `?${searchStr}` : '';
      router.replace(`${pathname}${query}`, { scroll: false });
    }

    fetchComplaints(statusFilter, null, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, fetchComplaints]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
  };

  const handleLoadMore = () => {
    if (nextCursor && !isAppending && !loading) {
      fetchComplaints(statusFilter, nextCursor, true);
    }
  };

  const handleRetry = () => {
    fetchComplaints(statusFilter, null, false);
  };

  const formatDate = (dateString: string) => {
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return dateString;
      return new Intl.DateTimeFormat('es-PE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(d);
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return dateString;
      return new Intl.DateTimeFormat('es-PE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch {
      return dateString;
    }
  };

  if (error && error.status === 401) {
    return (
      <div className={styles.alertWarning} role="alert">
        <p>{error.message}</p>
        <button
          className={styles.retryButton}
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.location.href = `/api/auth/login?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`;
            }
          }}
        >
          Iniciar sesión
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.filterGroup}>
          <label htmlFor="status-filter" className={styles.filterLabel}>Estado</label>
          <select
            id="status-filter"
            className={styles.filterSelect}
            value={statusFilter}
            onChange={handleFilterChange}
            disabled={loading && !isAppending}
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div aria-live="polite" className={styles.srOnly}>
        {loading && !isAppending ? 'Cargando reclamos...' : ''}
        {!loading && items.length === 0 && !error ? 'No se encontraron reclamos con este filtro.' : ''}
      </div>

      {error ? (
        <div className={styles.alert} role="alert">
          <p>{error.message}</p>
          {(error.status !== 403 && error.status !== 401) && (
            <button className={styles.retryButton} onClick={handleRetry}>
              Reintentar
            </button>
          )}
        </div>
      ) : loading && !isAppending ? (
        <div className={styles.emptyState}>Cargando...</div>
      ) : items.length === 0 ? (
        <div className={styles.emptyState}>
          No hay reclamos para mostrar con este filtro.
        </div>
      ) : (
        <>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Número de hoja</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Fecha de envío</th>
                  <th scope="col">Fecha límite</th>
                  <th scope="col" className={styles.colUpdatedAt}>Última actualización</th>
                  <th scope="col"><span className={styles.srOnly}>Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.complaintId}>
                    <td>{item.sheetNumber}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${styles[`status_${item.status}`]}`}>
                        {getStatusLabel(item.status)}
                      </span>
                    </td>
                    <td>{formatDate(item.submittedAt)}</td>
                    <td>{formatDate(item.deadlineAt)}</td>
                    <td className={styles.colUpdatedAt}>{formatDateTime(item.updatedAt)}</td>
                    <td>
                      <Link href={`/app/reclamos/${item.complaintId}`} className={styles.detailLink}>
                        Ver detalle
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className={styles.mobileList}>
            {items.map(item => (
              <li key={item.complaintId} className={styles.mobileCard}>
                <div className={styles.cardRow}>
                  <span className={styles.cardLabel}>Número de hoja</span>
                  <span className={styles.cardValue}>{item.sheetNumber}</span>
                </div>
                <div className={styles.cardRow}>
                  <span className={styles.cardLabel}>Estado</span>
                  <span className={`${styles.statusBadge} ${styles[`status_${item.status}`]}`}>
                    {getStatusLabel(item.status)}
                  </span>
                </div>
                <div className={styles.cardRow}>
                  <span className={styles.cardLabel}>Fecha límite</span>
                  <span className={styles.cardValue}>{formatDate(item.deadlineAt)}</span>
                </div>
                <div className={styles.cardRow}>
                  <span className={styles.cardLabel}>Fecha de envío</span>
                  <span className={styles.cardValue}>{formatDate(item.submittedAt)}</span>
                </div>
                <div className={styles.cardActionRow}>
                  <Link href={`/app/reclamos/${item.complaintId}`} className={styles.detailLink}>
                    Ver detalle
                  </Link>
                </div>
              </li>
            ))}
          </ul>

          {nextCursor && (
            <div className={styles.loadMoreContainer}>
              <button
                className={styles.loadMoreButton}
                onClick={handleLoadMore}
                disabled={isAppending}
              >
                {isAppending ? 'Cargando...' : 'Cargar más'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
