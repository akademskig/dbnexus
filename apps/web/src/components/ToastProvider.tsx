import { Snackbar, Alert, Slide, SlideProps } from '@mui/material';
import { useToastStore } from '../stores/toastStore';

function SlideTransition(props: SlideProps) {
    return <Slide {...props} direction="up" />;
}

export function ToastProvider() {
    const { toasts, removeToast } = useToastStore();

    return (
        <>
            {toasts.map((toast, index) => (
                <Snackbar
                    key={toast.id}
                    open={true}
                    autoHideDuration={toast.duration}
                    onClose={() => removeToast(toast.id)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    TransitionComponent={SlideTransition}
                    sx={{
                        bottom: { xs: 24 + index * 60, sm: 24 + index * 60 },
                    }}
                >
                    <Alert
                        onClose={() => removeToast(toast.id)}
                        severity={toast.severity}
                        variant="filled"
                        sx={{
                            width: '100%',
                            minWidth: 280,
                            boxShadow: 3,
                            '& .MuiAlert-message': {
                                fontSize: 14,
                            },
                        }}
                    >
                        {toast.message}
                    </Alert>
                </Snackbar>
            ))}
        </>
    );
}
