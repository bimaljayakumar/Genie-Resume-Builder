import '../styles/globals.css';
import { SessionProvider } from 'next-auth/react';
import { Provider as ReduxProvider } from 'react-redux';
import { store } from 'lib/redux/store';

export default function App({ Component, pageProps: { session, ...pageProps } }) {
  return (
    <SessionProvider session={session}>
      <ReduxProvider store={store}>
        <Component {...pageProps} />
      </ReduxProvider>
    </SessionProvider>
  );
}
