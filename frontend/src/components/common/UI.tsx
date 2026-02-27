import React from 'react';
import { motion } from 'framer-motion';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'outline' | 'ghost' | 'danger' | 'accent';
    isLoading?: boolean;
    grow?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    isLoading,
    grow,
    className = '',
    ...props
}) => {
    const baseStyles = "btn";
    const variants = {
        primary: "btn-primary",
        outline: "btn-outline",
        accent: "btn-accent", // Custom purple accent
        ghost: "btn-ghost",
        danger: "btn-danger"
    };

    return (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`${baseStyles} ${variants[variant]} ${grow ? 'w-full' : ''} ${isLoading ? 'btn-loading' : ''} ${className}`}
            disabled={isLoading || props.disabled}
            {...(props as any)}
        >
            {isLoading && <div className="loading-shimmer" />}
            {children}
        </motion.button>

    );
};

export const Card: React.FC<{
    children: React.ReactNode;
    className?: string;
    glass?: boolean;
    style?: React.CSSProperties;
}> = ({ children, className = '', glass = true, style }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${glass ? 'glass-panel' : 'glass-card'} ${className}`}
            style={style}
        >
            {children}
        </motion.div>
    );
};
