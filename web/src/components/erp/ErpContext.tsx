import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { ErpStore } from "../../lib/pf/store";

const Context = createContext<ErpStore | null>(null);

export function ErpStoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => new ErpStore());
  useEffect(() => {
    void store.load();
  }, [store]);
  return <Context.Provider value={store}>{children}</Context.Provider>;
}

/** The shared ERP state; the calling component re-renders whenever it changes. */
export function useErpStore() {
  const store = useContext(Context);
  if (!store) throw new Error("useErpStore must be used inside ErpStoreProvider");
  const read = () => store.revision;
  useSyncExternalStore(store.subscribe, read, read);
  return store;
}
