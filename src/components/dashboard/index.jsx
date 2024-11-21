import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Container, Typography, CircularProgress, Box, Paper } from '@mui/material';

const Dashboard = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data, error } = await supabase
          .from('measurements')
          .select('*')
          .eq('station_id', 805)  // Torino - Rebaudengo
          .eq('parameter_id', 'PM2.5_B')
          .order('measurement_date', { ascending: true })
          .limit(100);

        if (error) {
          console.error('Error fetching data:', error);
        } else {
          console.log('Fetched data:', data);
          setData(data);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Paper elevation={3} style={{ padding: '16px' }}>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="measurement_date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="value" stroke="#8884d8" />
          </LineChart>
        </ResponsiveContainer>
      </Paper>
    </Container>
  );
};

export default Dashboard;