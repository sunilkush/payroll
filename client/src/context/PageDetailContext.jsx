import { createContext, useContext, useEffect, useMemo, useState } from 'react';

// Page ke andar ab bada title nahi hota (page ka naam top bar mein hai). Lekin detail pages par ek
// khaas naam hota hai (company ka naam, staff ka naam, "Add Staff") jo top bar ko pata nahi.
// Page use yahan rakhta hai (usePageDetail) aur top bar breadcrumb mein dikhata hai (useCurrentPageDetail).
const PageDetailContext = createContext({ detail: '', setDetail: () => {} });

export function PageDetailProvider({ children }) {
  const [detail, setDetail] = useState('');
  const value = useMemo(() => ({ detail, setDetail }), [detail]);
  return <PageDetailContext.Provider value={value}>{children}</PageDetailContext.Provider>;
}

// Page: apna khaas naam top bar ko do. Page chhodne par apne aap hat jata hai.
export function usePageDetail(detail) {
  const { setDetail } = useContext(PageDetailContext);
  useEffect(() => {
    setDetail(detail ?? '');
    return () => setDetail('');
  }, [detail, setDetail]);
}

// Top bar: chalu page ka khaas naam ('' ho to kuch nahi)
export const useCurrentPageDetail = () => useContext(PageDetailContext).detail;
