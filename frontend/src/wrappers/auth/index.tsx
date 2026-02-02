import { useEffect } from 'react';
import { history } from '@umijs/max';

export default (props: any) => {
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      history.push('/login');
    }
  }, [token]);

  if (!token) {
    return null;
  }

  return props.children;
};
