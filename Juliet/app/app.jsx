// App shell — wires screens together with navigation state.

const { T: TS, TabBar: TB } = window.UI;

function App() {
  const [tab, setTab] = React.useState('inbox');
  const [stack, setStack] = React.useState([]); // navigation stack
  const [captureOpen, setCaptureOpen] = React.useState(false);
  // Read onboarding state from a global so the canvas can decide per-artboard
  const [onboarded, setOnboarded] = React.useState(window.__SEC_ONBOARDED !== false);
  const [filedToast, setFiledToast] = React.useState(null);

  // External nav events from screens
  React.useEffect(() => {
    const onContacts = () => setStack(s => [...s, { kind: 'contacts' }]);
    const onSearch = () => setStack(s => [...s, { kind: 'contacts' }]);
    window.addEventListener('navContacts', onContacts);
    window.addEventListener('navSearch', onSearch);
    return () => {
      window.removeEventListener('navContacts', onContacts);
      window.removeEventListener('navSearch', onSearch);
    };
  }, []);

  function openItem(id) { setStack(s => [...s, { kind: 'item', id }]); }
  function openEntity(id) { setStack(s => [...s, { kind: 'entity', id }]); }
  function back() { setStack(s => s.slice(0, -1)); }

  if (!onboarded) {
    return <window.Onboarding onDone={() => setOnboarded(true)} />;
  }

  // Modal capture
  if (captureOpen) {
    return (
      <window.CaptureFlow
        onClose={() => setCaptureOpen(false)}
        onFiled={(pages) => {
          setCaptureOpen(false);
          setFiledToast(`Filed ${pages.length} item${pages.length > 1 ? 's' : ''} · reminders set`);
          setTimeout(() => setFiledToast(null), 3000);
        }}
      />
    );
  }

  // Modal-ish stack views
  const top = stack[stack.length - 1];
  let body;
  if (top?.kind === 'item') body = <window.ItemDetail itemId={top.id} onBack={back} />;
  else if (top?.kind === 'entity') body = <window.FileManager entityId={top.id} onBack={back} onOpenItem={openItem} />;
  else if (top?.kind === 'contacts') body = <window.ContactsView onBack={back} />;
  else if (tab === 'inbox') body = <window.InboxView onOpenItem={openItem} onOpenEntity={openEntity} onNavigate={setTab} />;
  else if (tab === 'entities') body = <window.EntitiesList onOpenEntity={openEntity} />;
  else if (tab === 'calendar') body = <window.CalendarView onOpenItem={openItem} />;
  else if (tab === 'ask') body = <window.AskView onOpenItem={openItem} />;

  function handleTabChange(t) {
    if (t === 'capture') return setCaptureOpen(true);
    setStack([]);
    setTab(t);
  }

  return (
    <div style={{ position: 'absolute', inset: 0, background: TS.bg, fontFamily: TS.font, color: TS.ink }}>
      <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {body}
      </div>
      <TB active={tab} onChange={handleTabChange} />

      {filedToast && (
        <div style={{
          position: 'absolute', left: 16, right: 16, bottom: 110, zIndex: 40,
          padding: '12px 14px', borderRadius: 12,
          background: TS.ink, color: '#fff',
          fontSize: 14, fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 6px 24px rgba(0,0,0,0.18)',
        }}>
          {Ic.check(18, '#fff', 2.5)} {filedToast}
        </div>
      )}
    </div>
  );
}

window.SecretaryApp = App;
