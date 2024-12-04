import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { 
  Container, 
  Typography, 
  CircularProgress, 
  Box, 
  Paper, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Button, 
  Grid,
  useTheme,
  useMediaQuery,
  Stack
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import { LineChart } from '@mui/x-charts/LineChart';
import RefreshIcon from '@mui/icons-material/Refresh';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

const Dashboard = () => {
  const [measurements, setMeasurements] = useState([]);
  const [stations, setStations] = useState([]);
  const [parameters, setParameters] = useState([]);
  const [selectedStation, setSelectedStation] = useState('');
  const [selectedParameter, setSelectedParameter] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [isLoadingCombos, setIsLoadingCombos] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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
      <Box sx={{ my: 4 }}>
        <Typography 
          variant="h4" 
          component="h1" 
          gutterBottom 
          align="center"
          sx={{ 
            color: 'primary.main',
            fontWeight: 500,
            mb: 4,
            fontFamily: 'Roboto Mono, monospace',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
            backgroundImage: 'linear-gradient(45deg, #1976d2, #64b5f6)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          Analisi Qualità dell'Aria
        </Typography>
      </Box>
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          mb: 4,
          backgroundColor: 'background.paper',
          borderRadius: 2
        }}
      >
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel id="station-label">Stazione</InputLabel>
              <Select
                labelId="station-label"
                value={selectedStation}
                label="Stazione"
                onChange={(e) => setSelectedStation(e.target.value)}
                disabled={isLoadingCombos}
                sx={{ 
                  height: 56,
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.light',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.main',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.dark',
                  }
                }}
              >
                {stations.map((station) => (
                  <MenuItem key={station.station_id} value={station.station_id}>
                    {station.station_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel id="parameter-label">Parametro</InputLabel>
              <Select
                labelId="parameter-label"
                value={selectedParameter}
                label="Parametro"
                onChange={(e) => setSelectedParameter(e.target.value)}
                disabled={isLoadingCombos}
                sx={{ 
                  height: 56,
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.light',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.main',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.dark',
                  }
                }}
              >
                {parameters.map((parameter) => (
                  <MenuItem key={parameter.parameter_id} value={parameter.parameter_id}>
                    {parameter.parameter_description}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="Data Inizio"
                value={startDate}
                onChange={(newValue) => setStartDate(newValue)}
                disabled={isLoadingCombos}
                format="DD/MM/YYYY"
                sx={{
                  width: '100%',
                  '& .MuiInputBase-root': {
                    height: 56,
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.light',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.main',
                  },
                  '& .Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.dark',
                  }
                }}
                slotProps={{
                  textField: {
                    variant: 'outlined',
                    fullWidth: true,
                  },
                  inputAdornment: {
                    position: 'end'
                  }
                }}
              />
            </LocalizationProvider>
          </Grid>

          <Grid item xs={12} md={6}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="Data Fine"
                value={endDate}
                onChange={(newValue) => setEndDate(newValue)}
                disabled={isLoadingCombos}
                format="DD/MM/YYYY"
                sx={{
                  width: '100%',
                  '& .MuiInputBase-root': {
                    height: 56,
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.light',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.main',
                  },
                  '& .Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.dark',
                  }
                }}
                slotProps={{
                  textField: {
                    variant: 'outlined',
                    fullWidth: true,
                  },
                  inputAdornment: {
                    position: 'end'
                  }
                }}
              />
            </LocalizationProvider>
          </Grid>

          <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Button
              variant="contained"
              onClick={handleUpdateClick}
              disabled={isLoadingData}
              startIcon={<RefreshIcon />}
              sx={{ 
                minWidth: '200px',
                height: '48px',
                fontSize: '1.1rem',
                textTransform: 'none',
                borderRadius: 2,
                boxShadow: 2,
                '&:hover': {
                  boxShadow: 4
                }
              }}
            >
              {isLoadingData ? <CircularProgress size={24} color="inherit" /> : 'Aggiorna'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {selectedParameter && measurements.length > 0 && (
        <StatsCard
          parameter={parameters.find(p => p.parameter_id === selectedParameter)}
          measurements={measurements}
          limit={parameters.find(p => p.parameter_id === selectedParameter)?.limit}
        />
      )}

      {measurements.length > 0 && (
        <Paper elevation={3} sx={{ p: isMobile ? 1 : 2 }}>
          <Box height={isMobile ? 300 : 400}>
            <LineChart
              xAxis={[{
                data: measurements.map(m => new Date(m.measurement_date)),
                scaleType: 'time',
                tickFormat: (value) => value.toLocaleDateString(),
                tickLabelStyle: {
                  fontSize: 12,
                  angle: 45,
                  textAnchor: 'start',
                  dy: 10
                }
              }]}
              series={[{
                data: measurements.map(m => m.value),
                area: true,
                label: parameters.find(p => p.parameter_id === selectedParameter)?.parameter_description,
              }]}
              height={isMobile ? 300 : 400}
            />
          </Box>
        </Paper>
      )}
    </Container>
  );
};

export default Dashboard;
