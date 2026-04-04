import { useState } from 'react';
import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Tabs,
    Tab,
    Chip,
    Typography,
    useTheme,
    useMediaQuery,
} from '@mui/material';

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';



export default function Progress({
    open,
    onClose,
    weightProgress = [],
    milkYieldProgress = [],
    typeProgress = [],
    dateProgress = [],
}) {
    const [tab, setTab] = useState(0);

    // ✅ Responsive detection
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const handleChange = (event, newValue) => {
        setTab(newValue);
    };

    const handleExportCSV = () => {
    // Determine which data we are currently looking at
    const currentData = tab === 0 ? weightProgress : milkYieldProgress;
    const label = tab === 0 ? "Weight" : "Milk_Yield";

    // Create Headers
    let csvContent = "Index,Date,Weight,Phase\n";

    // Build Rows
    currentData.forEach((val, idx) => {
        const date = dateProgress[idx] ? new Date(dateProgress[idx]).toLocaleDateString() : `Entry ${idx + 1}`;
        const phase = typeProgress[idx] || "N/A";
        // Clean phase string of commas to prevent CSV breaking
        const cleanPhase = phase.replace(/,/g, ''); 
        csvContent += `${idx + 1},${date},${val},${cleanPhase}\n`;
    });

    // Create Download Link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);

    // Progress-NameofCarabao
    link.setAttribute("download", `Progress_${label}_${new Date().toLocaleDateString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
    const formatData = (arr) =>
    arr.map((value, index) => {
        const rawDate = dateProgress[index];
        const phase = typeProgress[index] || 'N/A'; // Get phase for this entry
        let displayDate = `Entry ${index + 1}`;

        if (rawDate) {
            const d = new Date(rawDate);
            if (!isNaN(d)) {
                displayDate = d.toLocaleDateString();
            }
        }

        return {
            fullKey: `${displayDate} (ID: ${index})`,
            displayDate,
            value,
            phase, // ✅ Added this to the data object
        };
    });

    const renderChart = (title, data, color, label) => (
        <Box sx={{ mt: 2 }}>
            <Typography
                variant="h6"
                sx={{
                    mb: 2,
                    fontSize: { xs: '1rem', sm: '1.25rem' },
                }}
            >
                {title}
            </Typography>

            {data.length === 0 ? (
                <Box
                    sx={{
                        height: 260,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px dashed #ccc',
                        borderRadius: 2,
                    }}
                >
                    <Typography variant="body2" color="text.secondary">
                        No data available yet
                    </Typography>
                </Box>
            ) : (
                <ResponsiveContainer width="100%" height={isMobile ? 260 : 320}>
                    <LineChart data={formatData(data)}>
                        <CartesianGrid strokeDasharray="3 3" />

                        {/* ✅ CLEAN RESPONSIVE X-AXIS */}
                        <XAxis
                            dataKey="fullKey"
                            tickFormatter={(value) => {
                                const date = value.split(' (ID:')[0];
                                const d = new Date(date);

                                if (isMobile && !isNaN(d)) {
                                    return d.toLocaleDateString(undefined, {
                                        month: 'short',
                                        day: 'numeric',
                                    }); // e.g. Mar 12
                                }

                                return date;
                            }}
                            tick={{ fontSize: isMobile ? 9 : 11 }}
                            interval={isMobile ? 1 : 'auto'}
                            padding={{ left: 10, right: 10 }}
                        />

                        <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} />

                        <Tooltip
    trigger="axis"
    // payload[0].payload gives us access to the full object returned in formatData
    formatter={(value, name, props) => {
        const phaseValue = props.payload.phase;
        return [
            <span key="val">
                <strong>{value} kg</strong> <br/>
                <span style={{ fontSize: '0.85rem', color: '#666' }}>Phase: {phaseValue}</span>
            </span>,
            label
        ];
    }}
    labelFormatter={(labelValue) => labelValue.split(' (ID:')[0]}
    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
/>

                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke={color}
                            strokeWidth={2}
                            dot={{ r: isMobile ? 2 : 4 }}
                            name={label}
                        />
                    </LineChart>
                </ResponsiveContainer>
            )}
        </Box>
    );

    const renderContent = () => {
        switch (tab) {
            case 0:
                return renderChart(
                    'Weight Progress',
                    weightProgress,
                    '#8884d8',
                    'Weight'
                );
            case 1:
                return renderChart(
                    'Milk Yield Progress',
                    milkYieldProgress,
                    '#82ca9d',
                    'Milk Yield'
                );
            default:
                return null;
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            fullScreen={isMobile} // ✅ fullscreen on mobile
        >
            <DialogTitle className="text-deepbrown font-medium">
                Progress Overview
            </DialogTitle>

            <DialogContent>
                {/* ✅ Phase History */}
                {/* <Box
                    sx={{
                        mb: 2,
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        gap: 1,
                    }}
                >
                    <Typography
                        variant="subtitle2"
                        sx={{
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            fontSize: '0.7rem',
                            letterSpacing: 1,
                        }}
                    >
                        Phase History:
                    </Typography>

                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            overflowX: 'auto',
                            gap: 1,
                            '&::-webkit-scrollbar': { display: 'none' },
                        }}
                    >
                        {typeProgress.length === 0 ? (
                            <Typography variant="caption" color="text.disabled">
                                No history
                            </Typography>
                        ) : (
                            typeProgress.map((type, idx) => (
                                <React.Fragment key={idx}>
                                    <Chip
                                        label={type}
                                        size="small"
                                        sx={{
                                            fontWeight: 600,
                                            height: 24,
                                        }}
                                    />
                                    {idx !== typeProgress.length - 1 && (
                                        <Typography sx={{ fontWeight: 'bold' }}>
                                            →
                                        </Typography>
                                    )}
                                </React.Fragment>
                            ))
                        )}
                    </Box>
                </Box> */}

                {/* ✅ Tabs */}
                <Tabs
                    value={tab}
                    onChange={handleChange}
                    variant={isMobile ? 'scrollable' : 'fullWidth'}
                    scrollButtons="auto"
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab label="Weight" />
                    {typeProgress.includes("Cow | Inahing kalabaw") && (
                        <Tab label="Milk Yield" />
                    )}
                </Tabs>

                <Box sx={{ py: 2 }}>{renderContent()}</Box>
            </DialogContent>

            <DialogActions 
    sx={{ 
        p: 2, 
        flexDirection: { xs: 'column', sm: 'row' }, 
        gap: 1 
    }}
>
    {/* Export Button */}
    <Button
        onClick={handleExportCSV}
        variant="outlined"
        fullWidth={isMobile}
        disabled={(tab === 0 ? weightProgress : milkYieldProgress).length === 0}
        sx={{ 
            color: '#608a58', 
            borderColor: '#608a58',
            '&:hover': { borderColor: '#4a6b44', bgcolor: 'rgba(96, 138, 88, 0.04)' }
        }}
    >
        Export CSV
    </Button>

    {/* Close Button */}
    <Button
        onClick={onClose}
        variant="contained"
        fullWidth={isMobile}
        sx={{ 
            bgcolor: '#608a58',
            '&:hover': { bgcolor: '#4a6b44' }
        }}
    >
        Close
    </Button>
</DialogActions>
        </Dialog>
    );
}