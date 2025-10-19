import React, { useRef, useEffect, useState } from 'react';
import ReactMapGL, { Marker, Popup, NavigationControl, GeolocateControl } from 'react-map-gl';
import { Box, Typography, Button, Chip, Paper } from '@mui/material';
import { Restaurant, CheckCircle, RadioButtonUnchecked, Navigation } from '@mui/icons-material';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || 'mapbox_placeholder';

const Map = ({
  venues = [],
  center = { lat: 52.3676, lng: 4.9041 }, // Amsterdam
  zoom = 12,
  height = 500,
  showRoute = false,
  interactive = true,
  currentLocation = null,
}) => {
  const mapRef = useRef(null);
  const [viewport, setViewport] = useState({
    latitude: center.lat,
    longitude: center.lng,
    zoom: zoom,
  });
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [userLocation, setUserLocation] = useState(currentLocation);

  useEffect(() => {
    // Update viewport when center changes
    setViewport((prev) => ({
      ...prev,
      latitude: center.lat,
      longitude: center.lng,
    }));
  }, [center]);

  useEffect(() => {
    // Fit map to show all venues
    if (venues.length > 0 && mapRef.current) {
      const map = mapRef.current.getMap();
      const bounds = venues.reduce(
        (bounds, venue) => {
          return bounds.extend([venue.longitude, venue.latitude]);
        },
        new window.mapboxgl.LngLatBounds(
          [venues[0].longitude, venues[0].latitude],
          [venues[0].longitude, venues[0].latitude]
        )
      );

      map.fitBounds(bounds, {
        padding: 50,
        maxZoom: 14,
        duration: 1000,
      });
    }
  }, [venues]);

  const getMarkerColor = (venue) => {
    if (venue.completed) return '#4caf50'; // Green
    if (venue.current) return '#2196f3'; // Blue
    return '#ff9800'; // Orange
  };

  const openInGoogleMaps = (venue) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${venue.latitude},${venue.longitude}`;
    window.open(url, '_blank');
  };

  return (
    <Box sx={{ width: '100%', height, position: 'relative', borderRadius: 2, overflow: 'hidden' }}>
      <ReactMapGL
        ref={mapRef}
        {...viewport}
        width="100%"
        height="100%"
        mapStyle="mapbox://styles/mapbox/streets-v11"
        onMove={(evt) => setViewport(evt.viewState)}
        mapboxAccessToken={MAPBOX_TOKEN}
        interactive={interactive}
      >
        {/* Navigation Controls */}
        <NavigationControl position="top-right" />

        {/* Geolocate Control */}
        <GeolocateControl
          position="top-right"
          trackUserLocation
          onGeolocate={(e) => {
            setUserLocation({
              latitude: e.coords.latitude,
              longitude: e.coords.longitude,
            });
          }}
        />

        {/* User Location Marker */}
        {userLocation && (
          <Marker latitude={userLocation.latitude} longitude={userLocation.longitude}>
            <Box
              sx={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                bgcolor: '#2196f3',
                border: '3px solid white',
                boxShadow: 2,
              }}
            />
          </Marker>
        )}

        {/* Venue Markers */}
        {venues.map((venue, index) => (
          <Marker
            key={venue.id || index}
            latitude={venue.latitude}
            longitude={venue.longitude}
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setSelectedVenue(venue);
            }}
          >
            <Box
              sx={{
                cursor: 'pointer',
                position: 'relative',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'scale(1.2)',
                },
              }}
            >
              {/* Marker Pin */}
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  bgcolor: getMarkerColor(venue),
                  border: '3px solid white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 3,
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '16px',
                }}
              >
                {venue.completed ? (
                  <CheckCircle sx={{ fontSize: 24 }} />
                ) : (
                  <Typography variant="body2" fontWeight="bold">
                    {index + 1}
                  </Typography>
                )}
              </Box>
              {/* Pin Point */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: -8,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 0,
                  height: 0,
                  borderLeft: '8px solid transparent',
                  borderRight: '8px solid transparent',
                  borderTop: `12px solid ${getMarkerColor(venue)}`,
                }}
              />
            </Box>
          </Marker>
        ))}

        {/* Popup for Selected Venue */}
        {selectedVenue && (
          <Popup
            latitude={selectedVenue.latitude}
            longitude={selectedVenue.longitude}
            onClose={() => setSelectedVenue(null)}
            closeButton={true}
            closeOnClick={false}
            offsetTop={-40}
          >
            <Paper elevation={0} sx={{ p: 1, minWidth: 200 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Restaurant color="primary" />
                <Typography variant="subtitle2" fontWeight="bold">
                  {selectedVenue.name}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {selectedVenue.address}
              </Typography>
              {selectedVenue.cuisine && (
                <Chip
                  label={selectedVenue.cuisine}
                  size="small"
                  sx={{ mb: 1 }}
                />
              )}
              {selectedVenue.completed ? (
                <Chip
                  icon={<CheckCircle />}
                  label="Completed"
                  color="success"
                  size="small"
                  sx={{ mb: 1, ml: 1 }}
                />
              ) : (
                <Chip
                  icon={<RadioButtonUnchecked />}
                  label="Not Visited"
                  variant="outlined"
                  size="small"
                  sx={{ mb: 1, ml: 1 }}
                />
              )}
              <Button
                variant="outlined"
                size="small"
                fullWidth
                startIcon={<Navigation />}
                onClick={() => openInGoogleMaps(selectedVenue)}
                sx={{ mt: 1 }}
              >
                Get Directions
              </Button>
            </Paper>
          </Popup>
        )}

        {/* Route Line (if enabled) */}
        {showRoute && venues.length > 1 && (
          <Box
            component="div"
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              pointerEvents: 'none',
            }}
          >
            {/* SVG path connecting venues would go here */}
            {/* This is a simplified version - in production, use Mapbox Directions API */}
          </Box>
        )}
      </ReactMapGL>

      {/* Legend */}
      <Paper
        sx={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          p: 2,
          minWidth: 150,
        }}
        elevation={3}
      >
        <Typography variant="caption" fontWeight="bold" gutterBottom display="block">
          Legend
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                bgcolor: '#4caf50',
                border: '2px solid white',
              }}
            />
            <Typography variant="caption">Completed</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                bgcolor: '#2196f3',
                border: '2px solid white',
              }}
            />
            <Typography variant="caption">Current Stop</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                bgcolor: '#ff9800',
                border: '2px solid white',
              }}
            />
            <Typography variant="caption">Not Visited</Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default Map;
