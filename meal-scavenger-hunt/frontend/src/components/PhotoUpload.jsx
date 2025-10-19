import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Button,
  Typography,
  Paper,
  LinearProgress,
  IconButton,
  Grid,
  Card,
  CardMedia,
  CardActions,
  Alert,
  Chip,
} from '@mui/material';
import {
  CloudUpload,
  Close,
  CheckCircle,
  Error,
  Image as ImageIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import photoService from '../services/photoService';

const PhotoUpload = ({
  teamId,
  venueId,
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024, // 10MB
  onUploadComplete,
  existingPhotos = [],
}) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadedFiles, setUploadedFiles] = useState(existingPhotos);

  const onDrop = useCallback(
    (acceptedFiles, rejectedFiles) => {
      // Handle rejected files
      rejectedFiles.forEach((file) => {
        file.errors.forEach((err) => {
          if (err.code === 'file-too-large') {
            toast.error(`File "${file.file.name}" is too large. Max size is ${maxSize / 1024 / 1024}MB`);
          } else if (err.code === 'file-invalid-type') {
            toast.error(`File "${file.file.name}" has invalid type. Only images are allowed.`);
          } else {
            toast.error(`Error with file "${file.file.name}": ${err.message}`);
          }
        });
      });

      // Check total files limit
      const totalFiles = files.length + acceptedFiles.length + uploadedFiles.length;
      if (totalFiles > maxFiles) {
        toast.error(`You can only upload up to ${maxFiles} photos`);
        return;
      }

      // Add previews to accepted files
      const filesWithPreview = acceptedFiles.map((file) =>
        Object.assign(file, {
          preview: URL.createObjectURL(file),
          id: Math.random().toString(36).substr(2, 9),
        })
      );

      setFiles((prev) => [...prev, ...filesWithPreview]);
    },
    [files, uploadedFiles, maxFiles, maxSize]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
    },
    maxSize,
    multiple: true,
  });

  const removeFile = (fileId) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === fileId);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((f) => f.id !== fileId);
    });
  };

  const removeUploadedFile = async (photoId) => {
    try {
      await photoService.deletePhoto(photoId);
      setUploadedFiles((prev) => prev.filter((p) => p.id !== photoId));
      toast.success('Photo deleted');
    } catch (error) {
      toast.error('Failed to delete photo');
    }
  };

  const uploadFiles = async () => {
    if (files.length === 0) {
      toast.error('No files to upload');
      return;
    }

    try {
      setUploading(true);
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append('photo', file);
        formData.append('team_id', teamId);
        if (venueId) {
          formData.append('venue_id', venueId);
        }

        try {
          // Simulate upload progress
          setUploadProgress((prev) => ({ ...prev, [file.id]: 0 }));

          const result = await photoService.uploadPhoto(formData, (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress((prev) => ({ ...prev, [file.id]: percentCompleted }));
          });

          setUploadProgress((prev) => ({ ...prev, [file.id]: 100 }));
          return result;
        } catch (error) {
          setUploadProgress((prev) => ({ ...prev, [file.id]: -1 })); // -1 indicates error
          throw error;
        }
      });

      const results = await Promise.all(uploadPromises);

      // Add uploaded files to the list
      setUploadedFiles((prev) => [...prev, ...results]);

      // Clear the pending files
      files.forEach((file) => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
      setFiles([]);
      setUploadProgress({});

      toast.success(`Successfully uploaded ${results.length} photo(s)`);

      if (onUploadComplete) {
        onUploadComplete(results);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload photos');
    } finally {
      setUploading(false);
    }
  };

  const canUploadMore = uploadedFiles.length + files.length < maxFiles;

  return (
    <Box>
      {/* Upload Area */}
      {canUploadMore && (
        <Paper
          {...getRootProps()}
          sx={{
            p: 4,
            mb: 3,
            textAlign: 'center',
            border: '2px dashed',
            borderColor: isDragActive ? 'primary.main' : 'divider',
            bgcolor: isDragActive ? 'primary.50' : 'background.paper',
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: 'primary.50',
            },
          }}
        >
          <input {...getInputProps()} />
          <CloudUpload sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            {isDragActive ? 'Drop photos here' : 'Drag & drop photos here'}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            or click to browse
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Supports: JPG, PNG, GIF, WebP • Max {maxSize / 1024 / 1024}MB per file •{' '}
            {maxFiles - uploadedFiles.length} slots remaining
          </Typography>
        </Paper>
      )}

      {/* Pending Files */}
      {files.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Ready to Upload ({files.length})
          </Typography>
          <Grid container spacing={2}>
            {files.map((file) => (
              <Grid item xs={12} sm={6} md={4} key={file.id}>
                <Card>
                  <CardMedia
                    component="img"
                    height="200"
                    image={file.preview}
                    alt={file.name}
                  />
                  <CardActions sx={{ justifyContent: 'space-between', px: 2 }}>
                    <Typography variant="caption" noWrap sx={{ flex: 1, pr: 1 }}>
                      {file.name}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {uploadProgress[file.id] !== undefined && (
                        <>
                          {uploadProgress[file.id] === -1 ? (
                            <Error color="error" fontSize="small" />
                          ) : uploadProgress[file.id] === 100 ? (
                            <CheckCircle color="success" fontSize="small" />
                          ) : (
                            <Typography variant="caption">
                              {uploadProgress[file.id]}%
                            </Typography>
                          )}
                        </>
                      )}
                      <IconButton
                        size="small"
                        onClick={() => removeFile(file.id)}
                        disabled={uploading}
                      >
                        <Close fontSize="small" />
                      </IconButton>
                    </Box>
                  </CardActions>
                  {uploadProgress[file.id] !== undefined &&
                    uploadProgress[file.id] !== -1 &&
                    uploadProgress[file.id] !== 100 && (
                      <LinearProgress
                        variant="determinate"
                        value={uploadProgress[file.id]}
                      />
                    )}
                </Card>
              </Grid>
            ))}
          </Grid>
          <Button
            variant="contained"
            startIcon={<CloudUpload />}
            onClick={uploadFiles}
            disabled={uploading}
            sx={{ mt: 2 }}
            fullWidth
          >
            {uploading ? 'Uploading...' : `Upload ${files.length} Photo(s)`}
          </Button>
        </Box>
      )}

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Uploaded Photos ({uploadedFiles.length})
          </Typography>
          <Grid container spacing={2}>
            {uploadedFiles.map((photo) => (
              <Grid item xs={12} sm={6} md={4} key={photo.id}>
                <Card>
                  <CardMedia
                    component="img"
                    height="200"
                    image={photo.url || photo.preview}
                    alt={photo.filename || 'Uploaded photo'}
                  />
                  <CardActions sx={{ justifyContent: 'space-between', px: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircle color="success" fontSize="small" />
                      <Typography variant="caption">Uploaded</Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => removeUploadedFile(photo.id)}
                      color="error"
                    >
                      <Close fontSize="small" />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Empty State */}
      {files.length === 0 && uploadedFiles.length === 0 && !canUploadMore && (
        <Alert severity="info" icon={<ImageIcon />}>
          Maximum number of photos ({maxFiles}) reached
        </Alert>
      )}
    </Box>
  );
};

export default PhotoUpload;
