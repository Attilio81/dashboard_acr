import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Container, Typography, CircularProgress, Box, Paper, FormControl, InputLabel, Select, MenuItem, Button, TextField, Grid } from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import { LineChart } from '@mui/x-charts/LineChart';

const Dashboard = () => {
  const [measurements, setMeasurements] = useState([]);
  const [stations, setStations] = useState([]);
  const [parameters, setParameters] = useState([]);
  const [selectedStation, setSelectedStation] = useState('');
  const [selectedParameter, setSelectedParameter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoadingCombos, setIsLoadingCombos] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Caricamento iniziale delle combo
  useEffect(() => {
    const loadComboData = async () => {
      try {
        console.log('Starting to load stations...');
        
        // Carica stazioni
        const { data: stationsData, error: stationsError } = await supabase
          .from('monitoring_stations')
          .select('station_id, station_name')
          .order('station_name');

        console.log('Stations response:', { data: stationsData, error: stationsError });

        if (stationsError) {
          console.error('Station loading error:', stationsError);
          throw stationsError;
        }

        console.log('Setting stations state:', stationsData);
        setStations(stationsData || []);

        // Carica parametri
        const { data: parametersData, error: parametersError } = await supabase
          .from('parameters')
          .select('parameter_id, parameter_description, limit, unit_description')
          .order('parameter_description');

        if (parametersError) throw parametersError;

        console.log('Parameters loaded:', parametersData); // Aggiungi questo

        setParameters(parametersData || []);
      } catch (error) {
        console.error('Errore nel caricamento dei dati:', error);
      } finally {
        setIsLoadingCombos(false);
      }
    };

    loadComboData();
  }, []);

  const handleUpdateClick = async () => {
    if (!selectedStation || !selectedParameter || !startDate || !endDate) {
      alert('Selezionare tutti i parametri richiesti');
      return;
    }

    setIsLoadingData(true);
    try {
      const { data, error } = await supabase
        .from('measurements')
        .select('*')
        .eq('station_id', selectedStation)
        .eq('parameter_id', selectedParameter)
        .gte('measurement_date', startDate)
        .lte('measurement_date', endDate)
        .order('measurement_date', { ascending: true });

      if (error) throw error;
      setMeasurements(data || []);
    } catch (error) {
      console.error('Errore nel caricamento delle misurazioni:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const calculateExceedances = (measurements, limit) => {
    if (!measurements || !limit) return 0;
    return measurements.filter(m => m.value > limit).length;
  };

  const StatsCard = ({ parameter, measurements, limit }) => {
    const exceedances = calculateExceedances(measurements, limit);
    const totalDays = measurements?.length || 0;
    
    return (
      <Paper 
        elevation={3} 
        sx={{ 
          p: 3, 
          mb: 3, 
          backgroundColor: exceedances > 0 ? '#fff3e0' : '#f1f8e9',
          border: exceedances > 0 ? '1px solid #ffb74d' : '1px solid #aed581'
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            {exceedances > 0 && <WarningIcon color="warning" fontSize="large" />}
          </Grid>
          <Grid item xs>
            <Typography variant="h6" gutterBottom>
              {parameter?.parameter_description}
            </Typography>
            <Typography variant="body1">
              Limite: {limit} {parameter?.unit_description}
            </Typography>
            <Typography variant="body1">
              Superamenti: {exceedances} su {totalDays} giorni
            </Typography>
            {exceedances > 0 && (
              <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
                Soglia superata nel {((exceedances/totalDays) * 100).toFixed(1)}% dei giorni
              </Typography>
            )}
          </Grid>
        </Grid>
      </Paper>
    );
  };

  if (isLoadingCombos) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom sx={{ my: 3 }}>
        Dashboard Qualità dell'Aria
      </Typography>
      
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box display="flex" gap={2} flexWrap="wrap">
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Stazione</InputLabel>
            <Select
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
              label="Stazione"
            >
              {stations.map((station) => (
                <MenuItem key={station.station_id} value={station.station_id}>
                  {station.station_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Parametro</InputLabel>
            <Select
              value={selectedParameter}
              onChange={(e) => setSelectedParameter(e.target.value)}
              label="Parametro"
            >
              {parameters.map((param) => (
                <MenuItem key={param.parameter_id} value={param.parameter_id}>
                  {param.parameter_description}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            type="date"
            label="Data Inizio"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            type="date"
            label="Data Fine"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          <Button
            variant="contained"
            onClick={handleUpdateClick}
            disabled={isLoadingData}
          >
            {isLoadingData ? <CircularProgress size={24} /> : 'Aggiorna'}
          </Button>
        </Box>
      </Paper>

      {selectedParameter && measurements.length > 0 && (
        <StatsCard 
          parameter={parameters.find(p => p.parameter_id === selectedParameter)}
          measurements={measurements}
          limit={parameters.find(p => p.parameter_id === selectedParameter)?.limit}
        />
      )}

      {measurements.length > 0 && (
        <Paper elevation={3} sx={{ p: 2 }}>
          <LineChart
            xAxis={[{ 
              data: measurements.map(m => new Date(m.measurement_date)),
              scaleType: 'time',
              tickFormat: (value) => value.toLocaleDateString()
            }]}
            series={[
              {
                data: measurements.map(m => m.value),
                area: true,
                label: parameters.find(p => p.parameter_id === selectedParameter)?.parameter_description,
              },
            ]}
            height={400}
          />
        </Paper>
      )}
    </Container>
  );
};

export default Dashboard;
