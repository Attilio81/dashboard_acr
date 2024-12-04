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
  useMediaQuery
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
  const [startDate, setStartDate] = useState(dayjs().subtract(1, 'year'));
  const [endDate, setEndDate] = useState(dayjs());
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

        console.log('Setting parameters state:', parametersData);
        setParameters(parametersData || []);
      } catch (error) {
        console.error('Error loading combo data:', error);
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
      <Typography 
        variant={isMobile ? "h5" : "h4"} 
        gutterBottom 
        sx={{ my: isMobile ? 2 : 3 }}
      >
        Dashboard Qualità dell'Aria
      </Typography>

      <Box 
        display="flex" 
        flexDirection={isMobile ? "column" : "row"}
        gap={2} 
        mb={3}
      >
        <FormControl fullWidth>
          <InputLabel>Stazione</InputLabel>
          <Select
            value={selectedStation}
            onChange={(e) => setSelectedStation(e.target.value)}
            size={isMobile ? "small" : "medium"}
          >
            {stations.map((station) => (
              <MenuItem key={station.station_id} value={station.station_id}>
                {station.station_name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>Parametro</InputLabel>
          <Select 
            value={selectedParameter}
            onChange={(e) => setSelectedParameter(e.target.value)}
            size={isMobile ? "small" : "medium"}
          >
            {parameters.map((param) => (
              <MenuItem key={param.parameter_id} value={param.parameter_id}>
                {param.parameter_description}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Box 
            sx={{ 
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: 2,
              mb: 3 
            }}
          >
            <FormControl fullWidth size={isMobile ? "small" : "medium"}>
              <DatePicker
                label="Data Inizio"
                value={startDate}
                onChange={(newValue) => setStartDate(newValue)}
                slotProps={{ 
                  textField: { 
                    size: isMobile ? "small" : "medium",
                    fullWidth: true 
                  } 
                }}
              />
            </FormControl>

            <FormControl fullWidth size={isMobile ? "small" : "medium"}>
              <DatePicker
                label="Data Fine"
                value={endDate}
                onChange={(newValue) => setEndDate(newValue)}
                slotProps={{ 
                  textField: { 
                    size: isMobile ? "small" : "medium",
                    fullWidth: true 
                  } 
                }}
              />
            </FormControl>
          </Box>
        </LocalizationProvider>

        <Button 
          variant="contained"
          fullWidth={isMobile}
          size={isMobile ? "small" : "medium"}
          onClick={handleUpdateClick}
          disabled={isLoadingData}
          sx={{ 
            minWidth: 'auto',
            width: isMobile ? '100%' : '56px',
            height: isMobile ? '36px' : '56px',
            borderRadius: '50%'
          }}
        >
          {isLoadingData ? (
            <CircularProgress size={24} />
          ) : (
            <RefreshIcon fontSize={isMobile ? "medium" : "large"} />
          )}
        </Button>
      </Box>

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
