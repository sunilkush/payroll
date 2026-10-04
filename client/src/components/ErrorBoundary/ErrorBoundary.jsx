import { Component } from 'react';
import { Button, Result } from 'antd';

// Kisi page ke code mein error aa jaye to poori screen safed hone ki jagah ye message dikhta hai.
// Menu aur navbar chalte rehte hain, to user doosre page par ja sakta hai.
// resetKey badalne par (jaise doosre page par jaane se) error hat jata hai.
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(previousProps) {
    if (this.state.error && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error, info) {
    console.error('Page crash:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <Result
        status="error"
        title="Is page mein kuch gadbad ho gayi"
        subTitle="Page dobara kholne se aksar theek ho jata hai. Na ho to apne admin / developer ko batayein."
        extra={
          <Button type="primary" onClick={() => window.location.reload()}>
            Page dobara kholein
          </Button>
        }
      />
    );
  }
}
